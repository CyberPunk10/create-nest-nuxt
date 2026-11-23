import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { removeTemplateFiles } from '../../src/personalize/remove-template-files.ts'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cnn-template-files-'))
  await writeFile(join(dir, 'LICENSE'), 'MIT License\n')
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

test('удаляет LICENSE шаблона', async () => {
  await removeTemplateFiles(dir)
  expect(existsSync(join(dir, 'LICENSE'))).toBe(false)
})

test('удаляет CI шаблона и тесты его скриптов', async () => {
  await mkdir(join(dir, '.github/workflows'), { recursive: true })
  await writeFile(join(dir, '.github/workflows/ci.yml'), 'name: CI\n')
  await mkdir(join(dir, 'scripts/tests'), { recursive: true })
  await writeFile(join(dir, 'scripts/tests/log.test.mjs'), '')
  await writeFile(join(dir, 'scripts/dev.mjs'), '')

  await removeTemplateFiles(dir)

  expect(existsSync(join(dir, '.github'))).toBe(false)
  expect(existsSync(join(dir, 'scripts/tests'))).toBe(false)
  expect(existsSync(join(dir, 'scripts/dev.mjs'))).toBe(true)
})
