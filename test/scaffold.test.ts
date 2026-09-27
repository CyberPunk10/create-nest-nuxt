import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UserError } from '../src/errors.ts'
import { t } from '../src/i18n.ts'
import { scaffold } from '../src/scaffold.ts'

// Вместо GitHub — заглушка giget: кладёт в папку маленький «шаблон» или
// падает, как без сети. Так проверяется то, что scaffold делает с папкой
// человека, без зависимости от сети.
const giget = vi.hoisted(() => ({ offline: false }))

vi.mock('giget', () => ({
  async downloadTemplate(_source: string, { dir }: { dir: string }) {
    if (giget.offline) throw new Error('fetch failed')
    const { writeFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    await writeFile(join(dir, 'package.json'), '{\n  "name": "template-nest-nuxt",\n  "license": "MIT"\n}\n')
    await writeFile(join(dir, 'LICENSE'), 'template license')
    await writeFile(join(dir, 'README.md'), 'template readme')
    return { dir }
  },
}))

// Спиннер в тестах только засоряет вывод.
vi.mock('@clack/prompts', async importOriginal => ({
  ...await importOriginal<typeof import('@clack/prompts')>(),
  spinner: () => ({ start() {}, stop() {} }),
}))

const messages = t('en')
let root: string
let dir: string

beforeEach(async () => {
  giget.offline = false
  root = await mkdtemp(join(tmpdir(), 'cnn-scaffold-'))
  dir = join(root, 'my-app')
  // Папка человека: его работа, свой LICENSE и git-репозиторий.
  await mkdir(join(dir, '.git'), { recursive: true })
  await writeFile(join(dir, 'notes.txt'), 'my work')
  await writeFile(join(dir, 'LICENSE'), 'my license')
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function read(file: string): Promise<string> {
  return readFile(join(dir, file), 'utf8')
}

describe('скачивание не удалось', () => {
  test.each(['remove', 'keep'] as const)('папка человека не меняется: %s', async (overwrite) => {
    giget.offline = true
    await expect(scaffold({ dir, variant: 'main', packageName: 'my-app', overwrite }, messages))
      .rejects.toThrow(UserError)
    expect((await readdir(dir)).sort()).toEqual(['.git', 'LICENSE', 'notes.txt'])
    expect(await read('notes.txt')).toBe('my work')
  })
})

describe('«Удалить файлы и продолжить»', () => {
  test('остаётся только шаблон и .git', async () => {
    await scaffold({ dir, variant: 'main', packageName: 'my-app', overwrite: 'remove' }, messages)
    expect((await readdir(dir)).sort()).toEqual(['.git', 'README.md', 'package.json'])
  })
})

describe('«Оставить файлы и продолжить»', () => {
  test('файлы человека на месте, совпадающие заменены шаблоном', async () => {
    await writeFile(join(dir, 'README.md'), 'my readme')
    await scaffold({ dir, variant: 'main', packageName: 'my-app', overwrite: 'keep' }, messages)
    expect(await read('notes.txt')).toBe('my work')
    expect(await read('README.md')).toBe('template readme')
  })

  test('свой LICENSE человека не удаляется — удаляется только LICENSE шаблона', async () => {
    await scaffold({ dir, variant: 'main', packageName: 'my-app', overwrite: 'keep' }, messages)
    expect(await read('LICENSE')).toBe('my license')
  })
})

test('шаблон персонализирован', async () => {
  await scaffold({ dir, variant: 'main', packageName: 'my-app', overwrite: 'remove' }, messages)
  expect(JSON.parse(await read('package.json'))).toEqual({ name: 'my-app', version: '0.0.0' })
})

test('несуществующая папка создаётся', async () => {
  const fresh = join(root, 'nested', 'fresh-app')
  await scaffold({ dir: fresh, variant: 'main', packageName: 'fresh-app', overwrite: 'keep' }, messages)
  expect((await readdir(fresh)).sort()).toEqual(['README.md', 'package.json'])
})
