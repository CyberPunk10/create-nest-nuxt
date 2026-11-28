import { existsSync, statSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { downloadTemplate } from 'giget'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locale } from '../src/i18n.ts'
import { TEMPLATE_REPO, templateRef, type Variant } from '../src/variants.ts'
import pkg from '../package.json' with { type: 'json' }
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
const REMOVED_MAINTAINER = 'apps/docs/guide/maintainer'

const REMOVED = [
  'LICENSE',
  '.github',
  'scripts/tests',
  REMOVED_MAINTAINER,
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

/** Конфиг VitePress и файлы языка в нём. */
const VITEPRESS = 'apps/docs/.vitepress'
const languageFiles = (code: string) => [`config/${code}.ts`, `locales/${code}.json`]

/** Строка со списком языков в config.ts. */
const localesLine = (codes: string) => `const LOCALES: LocaleEntry[] = [${codes}]`

/** Поля корневого package.json, которые описывают шаблон и удаляются. */
const TEMPLATE_FIELDS = ['author', 'license', 'keywords', 'description']

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

    test.each(Object.entries(DOCS_LANGUAGES))('есть документация на языке %s', (code, folder) => {
      for (const page of DOCS_PAGES) {
        expect(existsSync(join(template, folder, page)), page).toBe(true)
      }
      for (const file of languageFiles(code)) {
        expect(existsSync(join(template, VITEPRESS, file)), file).toBe(true)
      }
    })

    test('в конфиге документации перечислены все языки', async () => {
      const config = await readFile(join(template, VITEPRESS, 'config.ts'), 'utf8')
      expect(config).toContain(localesLine('ru, en, th'))
      expect(await readFile(join(template, VITEPRESS, 'config/en.ts'), 'utf8')).toContain(`key: 'en'`)
    })

    test('в сайдбаре русской документации есть раздел для мейнтейнера', async () => {
      expect(await readFile(join(template, VITEPRESS, 'config/ru.ts'), 'utf8')).toContain('/guide/maintainer/')
    })

    test.each(TEMPLATE_FIELDS)('в package.json есть поле %s', async (field) => {
      expect(await readJson(join(template, 'package.json'))).toHaveProperty(field)
    })

    // Версия Node для разработки одна на оба репозитория: обновили в
    // шаблоне — обновите и в генераторе.
    test('.nvmrc совпадает с .nvmrc генератора', async () => {
      const own = await readFile(join(import.meta.dirname, '..', '.nvmrc'), 'utf8')
      expect(await readFile(join(template, '.nvmrc'), 'utf8')).toBe(own)
    })

    // Версия pnpm тоже одна на оба репозитория: CI ставит pnpm генератора
    // и для созданного проекта.
    test('packageManager совпадает с packageManager генератора', async () => {
      expect((await readJson(join(template, 'package.json'))).packageManager).toBe(pkg.packageManager)
    })

    test('в паспорте проекта только часть шаблона: вариант своей ветки', async () => {
      const { templateOrigin } = await readJson(join(template, 'package.json'))
      expect(templateOrigin).toEqual({
        variant,
        repository: TEMPLATE_REPO,
        baseVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      })
    })
  })

  test('завершается успешно и подсказывает cd в папку проекта', () => {
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('cd my-app')
  })

  test(`package.json: имя проекта, версия 0.0.0, нет полей ${TEMPLATE_FIELDS.join(', ')}`, async () => {
    const pkg = await readJson(join(dir, 'package.json'))
    expect(pkg).toMatchObject({ name: 'my-app', version: '0.0.0' })
    for (const field of TEMPLATE_FIELDS) {
      expect(pkg, field).not.toHaveProperty(field)
    }
  })

  // Часть шаблона переходит как есть, генератор дописывает свою: версию
  // запущенного CLI, сегодняшнюю дату и выбранный язык.
  test('паспорт проекта дополнен генератором', async () => {
    const created = (await readJson(join(dir, 'package.json'))).templateOrigin
    const original = (await readJson(join(template, 'package.json'))).templateOrigin
    const now = new Date()
    const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map(n => String(n).padStart(2, '0')).join('-')
    expect(created).toEqual({
      ...original,
      createdWith: `create-nest-nuxt@${pkg.version}`,
      createdAt: today,
      docsLanguage: lang,
    })
  })

  // `nest new` записывает в package.json backend `"license": "UNLICENSED"` —
  // «использовать запрещено», что противоречит лицензии самого проекта.
  // Генератор backend не трогает: эти поля убраны в самом шаблоне, поэтому
  // проверки «в шаблоне было» здесь нет — тест следит, чтобы они не вернулись.
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
    // Набор страниц тот же, и каждая страница совпадает с шаблоном побайтно:
    // так видно, что в корне именно выбранный язык, а не остатки русского.
    // Раздел для мейнтейнера есть только в русском шаблоне и удаляется
    // отдельно — его отсутствие проверяет «удалён …».
    const pages = (await readdir(join(chosen, 'guide'), { recursive: true }))
      .filter(path => !join(DOCS_LANGUAGES.ru, 'guide', path).startsWith(REMOVED_MAINTAINER))
    expect(await readdir(join(docs, 'guide'), { recursive: true })).toEqual(pages)
    for (const page of ['index.md', ...pages.map(path => join('guide', path))]) {
      if (!statSync(join(chosen, page)).isFile()) continue
      expect(await readFile(join(docs, page), 'utf8'), page).toBe(await readFile(join(chosen, page), 'utf8'))
    }
    for (const other of ['en', 'th'] as const) {
      expect(existsSync(join(dir, DOCS_LANGUAGES[other])), `папка ${other}`).toBe(false)
    }
  })

  test('в конфиге документации только выбранный язык, и он корневой', async () => {
    const vitepress = join(dir, VITEPRESS)
    const config = await readFile(join(vitepress, 'config.ts'), 'utf8')
    expect(config).toContain(localesLine(lang))
    expect(config).toContain(`'./locales/${lang}.json'`)

    const own = await readFile(join(vitepress, `config/${lang}.ts`), 'utf8')
    expect(own).toContain(`key: 'root'`)
    expect(own).not.toContain(`'/${lang}/`)
    expect(own, 'раздел для мейнтейнера').not.toContain('/guide/maintainer')

    for (const other of Object.keys(DOCS_LANGUAGES).filter(code => code !== lang)) {
      expect(config, `импорт ${other}`).not.toContain(`./config/${other}'`)
      for (const file of languageFiles(other)) {
        expect(existsSync(join(vitepress, file)), file).toBe(false)
      }
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
