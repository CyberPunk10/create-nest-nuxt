import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { removeMaintainerDocs } from '../../src/personalize/remove-maintainer-docs.ts'
import { writeDocs, writeMaintainerDocs } from './docs-fixture.ts'

let dir: string
const ruConfig = () => join(dir, 'apps/docs/.vitepress/config/ru.ts')

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cnn-maintainer-'))
  await writeDocs(dir)
  await writeMaintainerDocs(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

test('удаляет страницы раздела и его группу в сайдбаре, остальное на месте', async () => {
  await removeMaintainerDocs(dir)
  expect(existsSync(join(dir, 'apps/docs/guide/maintainer'))).toBe(false)
  expect(existsSync(join(dir, 'apps/docs/guide/setup.md'))).toBe(true)
  const config = await readFile(ruConfig(), 'utf8')
  expect(config).not.toContain('maintainer')
  expect(config).toContain(`link: '/guide/getting-started/setup'`)
})

test('падает, если папки раздела нет', async () => {
  await rm(join(dir, 'apps/docs/guide/maintainer'), { recursive: true })
  await expect(removeMaintainerDocs(dir)).rejects.toThrow('ENOENT')
})

test('падает, если ссылка на раздел осталась вне группы', async () => {
  await writeFile(ruConfig(), `${await readFile(ruConfig(), 'utf8')}  { link: '/guide/maintainer/x' },\n`)
  await expect(removeMaintainerDocs(dir)).rejects.toThrow('/guide/maintainer left')
})
