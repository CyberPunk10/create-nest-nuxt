import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { personalize } from '../src/personalize.ts'

// Фикстура повторяет то, что приходит из шаблона: корневой package.json с
// полями автора шаблона и его LICENSE.
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cnn-personalize-'))
  await writeFile(join(dir, 'LICENSE'), 'MIT License\n')
  await writeFile(join(dir, 'package.json'), `${JSON.stringify({
    name: 'template-nest-nuxt',
    version: '1.4.0',
    description: 'Template',
    keywords: ['nestjs'],
    author: 'CyberPunk10',
    license: 'MIT',
    private: true,
    scripts: { dev: 'node scripts/dev.mjs' },
  }, null, 4)}\n`)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function readPackage(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
}

test('выставляет имя и сбрасывает версию', async () => {
  await personalize(dir, 'my-app', 'ru')
  const pkg = await readPackage()
  expect(pkg.name).toBe('my-app')
  expect(pkg.version).toBe('0.0.0')
})

test('убирает поля, описывающие шаблон', async () => {
  await personalize(dir, 'my-app', 'ru')
  const pkg = await readPackage()
  for (const field of ['author', 'license', 'keywords', 'description']) {
    expect(pkg).not.toHaveProperty(field)
  }
})

test('остальные поля не трогает', async () => {
  await personalize(dir, 'my-app', 'ru')
  const pkg = await readPackage()
  expect(pkg.private).toBe(true)
  expect(pkg.scripts).toEqual({ dev: 'node scripts/dev.mjs' })
})

test('удаляет LICENSE шаблона', async () => {
  await personalize(dir, 'my-app', 'ru')
  expect(existsSync(join(dir, 'LICENSE'))).toBe(false)
})

test('удаляет CI шаблона и тесты его скриптов', async () => {
  await mkdir(join(dir, '.github/workflows'), { recursive: true })
  await writeFile(join(dir, '.github/workflows/ci.yml'), 'name: CI\n')
  await mkdir(join(dir, 'scripts/tests'), { recursive: true })
  await writeFile(join(dir, 'scripts/tests/log.test.mjs'), '')
  await writeFile(join(dir, 'scripts/dev.mjs'), '')

  await personalize(dir, 'my-app', 'ru')

  expect(existsSync(join(dir, '.github'))).toBe(false)
  expect(existsSync(join(dir, 'scripts/tests'))).toBe(false)
  expect(existsSync(join(dir, 'scripts/dev.mjs'))).toBe(true)
})

test('сохраняет отступ исходного файла', async () => {
  await personalize(dir, 'my-app', 'ru')
  const raw = await readFile(join(dir, 'package.json'), 'utf8')
  expect(raw).toMatch(/^\{\n {4}"name"/)
  expect(raw.endsWith('}\n')).toBe(true)
})

test('сохраняет отступ табами', async () => {
  await writeFile(join(dir, 'package.json'), '{\n\t"name": "x",\n\t"version": "1.0.0"\n}\n')
  await personalize(dir, 'my-app', 'ru')
  const raw = await readFile(join(dir, 'package.json'), 'utf8')
  expect(raw).toBe('{\n\t"name": "my-app",\n\t"version": "0.0.0"\n}\n')
})

describe('документация на одном языке', () => {
  // Как в шаблоне: русская в корне apps/docs, остальные — в подпапках.
  beforeEach(async () => {
    for (const [folder, text] of [['', 'ru'], ['en', 'en'], ['th', 'th']] as const) {
      const docs = join(dir, 'apps/docs', folder)
      await mkdir(join(docs, 'guide'), { recursive: true })
      await writeFile(join(docs, 'index.md'), `# ${text}\n`)
      await writeFile(join(docs, 'guide/setup.md'), `${text} setup\n`)
    }
  })

  async function readDocs(file: string): Promise<string> {
    return readFile(join(dir, 'apps/docs', file), 'utf8')
  }

  test('русская остаётся в корне, подпапки остальных языков удалены', async () => {
    await personalize(dir, 'my-app', 'ru')
    expect(await readDocs('index.md')).toBe('# ru\n')
    expect(await readDocs('guide/setup.md')).toBe('ru setup\n')
    expect(existsSync(join(dir, 'apps/docs/en'))).toBe(false)
    expect(existsSync(join(dir, 'apps/docs/th'))).toBe(false)
  })

  test('выбранный язык переезжает из подпапки в корень вместо русского', async () => {
    await personalize(dir, 'my-app', 'en')
    expect(await readDocs('index.md')).toBe('# en\n')
    expect(await readDocs('guide/setup.md')).toBe('en setup\n')
    expect(existsSync(join(dir, 'apps/docs/en'))).toBe(false)
    expect(existsSync(join(dir, 'apps/docs/th'))).toBe(false)
  })
})
