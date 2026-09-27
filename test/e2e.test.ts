import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Variant } from '../src/variants.ts'
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

const VARIANTS: { variant: Variant, has: (keyof typeof MARKERS)[] }[] = [
  { variant: 'main', has: [] },
  { variant: 'auth-session', has: ['auth'] },
  { variant: 'postgres-prisma', has: ['auth', 'prisma'] },
]

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

describe.each(VARIANTS)('вариант $variant', ({ variant, has }) => {
  let dir: string
  let result: ReturnType<typeof run>

  beforeAll(async () => {
    const cwd = join(root, variant)
    await mkdir(cwd)
    dir = join(cwd, 'my-app')
    result = run(['my-app', '--variant', variant, '--lang', 'en'], cwd)
  }, DOWNLOAD_TIMEOUT)

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

  test('LICENSE шаблона удалён', () => {
    expect(existsSync(join(dir, 'LICENSE'))).toBe(false)
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
