import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { downloadTemplate } from 'giget'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locale } from '../src/i18n.ts'
import { TEMPLATE_REPO, templateRef, type Variant } from '../src/variants.ts'
import { run } from './cli.ts'

// Полный проход: собранный CLI с ответами в аргументах скачивает настоящий
// шаблон с GitHub, и проверяется итоговое дерево файлов. Только такой тест
// заметит, что генератор разошёлся с шаблоном: например, в шаблоне
// переименовали файл, который генератор должен удалять. Нужна сеть.

const DOWNLOAD_TIMEOUT = 60_000

/**
 * Чем варианты отличаются. Признак проверяется двумя способами: зависимость
 * говорит, что вариант умеет, а файл — что код на месте. И в обе стороны:
 * у варианта без авторизации её признаков быть не должно, иначе скачалась
 * не та ветка.
 */
const MARKERS = {
  auth: { dependency: 'passport', file: 'apps/backend/src/modules/auth/auth.module.ts' },
  prisma: { dependency: '@prisma/client', file: 'apps/backend/prisma/schema.prisma' },
}

// Язык у каждого варианта свой, чтобы без лишних скачиваний проверить оба
// случая: русская документация остаётся в корне, остальные переезжают туда
// из подпапки.
const VARIANTS: { variant: Variant, lang: Locale, has: (keyof typeof MARKERS)[] }[] = [
  { variant: 'main', lang: 'ru', has: [] },
  { variant: 'auth-session', lang: 'en', has: ['auth'] },
  { variant: 'postgres-prisma', lang: 'th', has: ['auth', 'prisma'] },
]

/**
 * Что генератор вычищает из шаблона. Проверка «в проекте этого нет» сама по
 * себе зелёная и тогда, когда шаблон переименовал файл, а генератор ничего не
 * удалил. Поэтому каждый путь проверяется дважды: в скачанном шаблоне он
 * есть, в проекте — нет.
 */
const REMOVED = [
  'LICENSE',
  '.github',
  'scripts/tests',
]

/**
 * Папки языков документации в шаблоне: русский лежит в корне `apps/docs`,
 * остальные — в подпапках. В проекте остаётся один язык, и он всегда в корне.
 */
const DOCS_LANGUAGES = {
  ru: 'apps/docs',
  en: 'apps/docs/en',
  th: 'apps/docs/th',
}

/** Страницы, из которых состоит документация на одном языке. */
const DOCS_PAGES = ['index.md', 'guide']

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(path, 'utf8'))
}

let root: string

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'cnn-e2e-'))
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

describe.each(VARIANTS)('вариант $variant, язык $lang', ({ variant, lang, has }) => {
  let dir: string
  let result: ReturnType<typeof run>
  /** Тот же шаблон, скачанный без генератора, — каким он был до чистки. */
  let template: string

  beforeAll(async () => {
    const cwd = join(root, variant)
    await mkdir(cwd)
    dir = join(cwd, 'my-app')
    result = run(['my-app', '--variant', variant, '--lang', lang], cwd)

    template = join(cwd, 'template')
    await downloadTemplate(`gh:${TEMPLATE_REPO}#${templateRef(variant)}`, { dir: template })
  }, DOWNLOAD_TIMEOUT)

  describe('шаблон до чистки', () => {
    test.each(REMOVED)('есть %s', (path) => {
      expect(existsSync(join(template, path))).toBe(true)
    })

    test.each(Object.entries(DOCS_LANGUAGES))('есть документация на языке %s', (_, folder) => {
      for (const page of DOCS_PAGES) {
        expect(existsSync(join(template, folder, page)), page).toBe(true)
      }
    })
  })

  test('завершается успешно и подсказывает cd в папку проекта', () => {
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('cd my-app')
  })

  test('package.json — проект пользователя, а не шаблон', async () => {
    const pkg = await readJson(join(dir, 'package.json'))
    expect(pkg).toMatchObject({ name: 'my-app', version: '0.0.0' })
    for (const field of ['author', 'license', 'keywords', 'description']) {
      expect(pkg).not.toHaveProperty(field)
    }
  })

  // `nest new` записывает в package.json backend `"license": "UNLICENSED"` —
  // «использовать запрещено», что противоречит лицензии самого проекта.
  test('у backend нет полей автора и лицензии', async () => {
    const backend = await readJson(join(dir, 'apps/backend/package.json'))
    expect(backend).not.toHaveProperty('author')
    expect(backend).not.toHaveProperty('license')
  })

  test.each(REMOVED)('удалён %s', (path) => {
    expect(existsSync(join(dir, path))).toBe(false)
  })

  test('документация только на выбранном языке и лежит в корне apps/docs', async () => {
    const docs = join(dir, DOCS_LANGUAGES.ru)
    const chosen = join(template, DOCS_LANGUAGES[lang])
    expect(await readFile(join(docs, 'index.md'), 'utf8')).toBe(await readFile(join(chosen, 'index.md'), 'utf8'))
    expect(await readdir(join(docs, 'guide'), { recursive: true }))
      .toEqual(await readdir(join(chosen, 'guide'), { recursive: true }))
    for (const other of ['en', 'th'] as const) {
      expect(existsSync(join(dir, DOCS_LANGUAGES[other])), `папка ${other}`).toBe(false)
    }
  })

  test.each(Object.keys(MARKERS) as (keyof typeof MARKERS)[])('признаки «%s»', async (marker) => {
    const { dependency, file } = MARKERS[marker]
    const expected = has.includes(marker)
    const backend = await readJson(join(dir, 'apps/backend/package.json'))
    expect(dependency in (backend.dependencies ?? {}), `зависимость ${dependency}`).toBe(expected)
    expect(existsSync(join(dir, file)), `файл ${file}`).toBe(expected)
  })
})

describe('в текущую папку', () => {
  let dir: string
  let result: ReturnType<typeof run>

  // Свежий клон пустого репозитория: только .git, вопроса о перезаписи нет.
  // Имя папки не годится для npm — без терминала берётся исправленное.
  beforeAll(async () => {
    dir = join(root, 'My_Shop')
    await mkdir(join(dir, '.git'), { recursive: true })
    result = run(['.', '--variant', 'main', '--lang', 'en'], dir)
  }, DOWNLOAD_TIMEOUT)

  test('без cd в подсказке', () => {
    expect(result.status).toBe(0)
    expect(result.stdout).not.toContain('cd ')
  })

  test('.git на месте, имя пакета исправлено из имени папки', async () => {
    expect(existsSync(join(dir, '.git'))).toBe(true)
    expect((await readJson(join(dir, 'package.json'))).name).toBe('my_shop')
  })
})
