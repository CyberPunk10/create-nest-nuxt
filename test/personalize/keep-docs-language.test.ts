import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { keepDocsLanguage } from '../../src/personalize/keep-docs-language.ts'
import { writeDocs } from './docs-fixture.ts'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cnn-docs-language-'))
  await writeDocs(dir)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function readDocs(file: string): Promise<string> {
  return readFile(join(dir, 'apps/docs', file), 'utf8')
}

test('русская остаётся в корне, подпапки остальных языков удалены', async () => {
  await keepDocsLanguage(dir, 'ru')
  expect(await readDocs('index.md')).toBe('# ru\n')
  expect(await readDocs('guide/setup.md')).toBe('ru setup\n')
  expect(existsSync(join(dir, 'apps/docs/en'))).toBe(false)
  expect(existsSync(join(dir, 'apps/docs/th'))).toBe(false)
})

test('выбранный язык переезжает из подпапки в корень вместо русского', async () => {
  await keepDocsLanguage(dir, 'en')
  expect(await readDocs('index.md')).toBe('# en\n')
  expect(await readDocs('guide/setup.md')).toBe('en setup\n')
  expect(existsSync(join(dir, 'apps/docs/en'))).toBe(false)
  expect(existsSync(join(dir, 'apps/docs/th'))).toBe(false)
})

test('конфиг русского: в LOCALES только он, конфиги и переводы остальных удалены', async () => {
  await keepDocsLanguage(dir, 'ru')
  expect(await readDocs('.vitepress/config.ts')).toBe([
    `import homeLocale from './locales/ru.json'`,
    `import ru from './config/ru'`,
    `const LOCALES: LocaleEntry[] = [ru]`,
    '',
  ].join('\n'))
  for (const file of ['config/en.ts', 'config/th.ts', 'locales/en.json', 'locales/th.json']) {
    expect(existsSync(join(dir, 'apps/docs/.vitepress', file)), file).toBe(false)
  }
})

test('конфиг английского: он корневой, ссылки без /en/, остальные удалены', async () => {
  await keepDocsLanguage(dir, 'en')
  expect(await readDocs('.vitepress/config.ts')).toBe([
    `import homeLocale from './locales/en.json'`,
    `import en from './config/en'`,
    `const LOCALES: LocaleEntry[] = [en]`,
    '',
  ].join('\n'))
  expect(await readDocs('.vitepress/config/en.ts')).toBe([
    `  key: 'root',`,
    `  { text: 'Setup', link: '/guide/getting-started/setup' },`,
    `  { text: 'Docker', link: '/guide/docker/' },`,
    '',
  ].join('\n'))
  for (const file of ['config/ru.ts', 'config/th.ts', 'locales/ru.json', 'locales/th.json']) {
    expect(existsSync(join(dir, 'apps/docs/.vitepress', file)), file).toBe(false)
  }
})

test('падает, если префикс языка остался вне ссылок сайдбара', async () => {
  const path = join(dir, 'apps/docs/.vitepress/config/en.ts')
  await writeFile(path, `${await readFile(path, 'utf8')}  { activeMatch: '/en/guide/' },\n`)
  await expect(keepDocsLanguage(dir, 'en')).rejects.toThrow('/en/ left in config/en.ts')
})

test('падает, если импорт языка встретился дважды', async () => {
  const path = join(dir, 'apps/docs/.vitepress/config.ts')
  await writeFile(path, `${await readFile(path, 'utf8')}import en from './config/en'\n`)
  await expect(keepDocsLanguage(dir, 'ru')).rejects.toThrow('found 2 times, expected once')
})

test('падает, если в шаблоне не нашлась строка, которую надо заменить', async () => {
  await writeFile(join(dir, 'apps/docs/.vitepress/config.ts'), `const LANGS = [ru, en, th]\n`)
  await expect(keepDocsLanguage(dir, 'en')).rejects.toThrow('Template mismatch')
})

test('падает до любых правок, если в папке языка есть лишняя страница', async () => {
  await writeFile(join(dir, 'apps/docs/th/faq.md'), '# faq\n')
  await expect(keepDocsLanguage(dir, 'en')).rejects.toThrow('apps/docs/th differs from ru: missing —, extra faq.md')
  // Ничего не тронуто: конфиг и папки языков на месте.
  expect(await readDocs('.vitepress/config.ts')).toContain('[ru, en, th]')
  expect(existsSync(join(dir, 'apps/docs/en'))).toBe(true)
})

test('падает, если у русской страницы нет перевода', async () => {
  await mkdir(join(dir, 'apps/docs/guide/deep'), { recursive: true })
  await writeFile(join(dir, 'apps/docs/guide/deep/page.md'), '# ru\n')
  await expect(keepDocsLanguage(dir, 'en')).rejects.toThrow('apps/docs/en differs from ru: missing guide/deep/page.md, extra —')
})
