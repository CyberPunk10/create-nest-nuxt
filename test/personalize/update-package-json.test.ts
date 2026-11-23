import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { updatePackageJson } from '../../src/personalize/update-package-json.ts'

// Как в шаблоне: корневой package.json с полями автора шаблона.
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cnn-package-json-'))
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

async function readRaw(): Promise<string> {
  return readFile(join(dir, 'package.json'), 'utf8')
}

async function readPackage(): Promise<Record<string, unknown>> {
  return JSON.parse(await readRaw())
}

test('выставляет имя и сбрасывает версию', async () => {
  await updatePackageJson(dir, 'my-app')
  const pkg = await readPackage()
  expect(pkg.name).toBe('my-app')
  expect(pkg.version).toBe('0.0.0')
})

test('убирает поля, описывающие шаблон', async () => {
  await updatePackageJson(dir, 'my-app')
  const pkg = await readPackage()
  for (const field of ['author', 'license', 'keywords', 'description']) {
    expect(pkg).not.toHaveProperty(field)
  }
})

test('остальные поля не трогает', async () => {
  await updatePackageJson(dir, 'my-app')
  const pkg = await readPackage()
  expect(pkg.private).toBe(true)
  expect(pkg.scripts).toEqual({ dev: 'node scripts/dev.mjs' })
})

test('сохраняет отступ исходного файла', async () => {
  await updatePackageJson(dir, 'my-app')
  const raw = await readRaw()
  expect(raw).toMatch(/^\{\n {4}"name"/)
  expect(raw.endsWith('}\n')).toBe(true)
})

test('сохраняет отступ табами', async () => {
  await writeFile(join(dir, 'package.json'), '{\n\t"name": "x",\n\t"version": "1.0.0"\n}\n')
  await updatePackageJson(dir, 'my-app')
  expect(await readRaw()).toBe('{\n\t"name": "my-app",\n\t"version": "0.0.0"\n}\n')
})
