import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
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
  await personalize(dir, 'my-app')
  const pkg = await readPackage()
  expect(pkg.name).toBe('my-app')
  expect(pkg.version).toBe('0.0.0')
})

test('убирает поля, описывающие шаблон', async () => {
  await personalize(dir, 'my-app')
  const pkg = await readPackage()
  for (const field of ['author', 'license', 'keywords', 'description']) {
    expect(pkg).not.toHaveProperty(field)
  }
})

test('остальные поля не трогает', async () => {
  await personalize(dir, 'my-app')
  const pkg = await readPackage()
  expect(pkg.private).toBe(true)
  expect(pkg.scripts).toEqual({ dev: 'node scripts/dev.mjs' })
})

test('удаляет LICENSE шаблона', async () => {
  await personalize(dir, 'my-app')
  expect(existsSync(join(dir, 'LICENSE'))).toBe(false)
})

test('сохраняет отступ исходного файла', async () => {
  await personalize(dir, 'my-app')
  const raw = await readFile(join(dir, 'package.json'), 'utf8')
  expect(raw).toMatch(/^\{\n {4}"name"/)
  expect(raw.endsWith('}\n')).toBe(true)
})

test('сохраняет отступ табами', async () => {
  await writeFile(join(dir, 'package.json'), '{\n\t"name": "x",\n\t"version": "1.0.0"\n}\n')
  await personalize(dir, 'my-app')
  const raw = await readFile(join(dir, 'package.json'), 'utf8')
  expect(raw).toBe('{\n\t"name": "my-app",\n\t"version": "0.0.0"\n}\n')
})
