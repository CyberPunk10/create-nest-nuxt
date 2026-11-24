import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Документация как в шаблоне: русская в корне apps/docs, остальные — в
 * подпапках; в конфиге VitePress — строки, которые правит генератор.
 *
 * Это упрощённая копия, и она может разойтись с настоящим шаблоном. Тесты на
 * ней проверяют логику чистки и случаи ошибок, которых в шаблоне нет
 * (строка не нашлась, встретилась дважды). Совпадение с настоящим шаблоном
 * проверяет e2e: он скачивает свежий шаблон с GitHub и прогоняет генератор.
 */
export async function writeDocs(dir: string): Promise<void> {
  const vitepress = join(dir, 'apps/docs/.vitepress')
  await mkdir(join(vitepress, 'config'), { recursive: true })
  await mkdir(join(vitepress, 'locales'), { recursive: true })
  await writeFile(join(vitepress, 'config.ts'), [
    `import homeLocale from './locales/ru.json'`,
    `import ru from './config/ru'`,
    `import en from './config/en'`,
    `import th from './config/th'`,
    `const LOCALES: LocaleEntry[] = [ru, en, th]`,
    '',
  ].join('\n'))

  for (const [folder, lang] of [['', 'ru'], ['en', 'en'], ['th', 'th']] as const) {
    const docs = join(dir, 'apps/docs', folder)
    await mkdir(join(docs, 'guide'), { recursive: true })
    await writeFile(join(docs, 'index.md'), `# ${lang}\n`)
    await writeFile(join(docs, 'guide/setup.md'), `${lang} setup\n`)
    await writeFile(join(vitepress, 'locales', `${lang}.json`), '{}\n')
    const key = lang === 'ru' ? 'root' : lang
    const prefix = lang === 'ru' ? '/' : `/${lang}/`
    await writeFile(join(vitepress, 'config', `${lang}.ts`), [
      `  key: '${key}',`,
      `  { text: 'Setup', link: '${prefix}guide/getting-started/setup' },`,
      `  { text: 'Docker', link: '${prefix}guide/docker/' },`,
      '',
    ].join('\n'))
  }
}

/**
 * Раздел для мейнтейнера, как в шаблоне: страница только в русской
 * документации и своя группа в её сайдбаре. Отдельно от {@link writeDocs}:
 * `keepDocsLanguage` получает документацию уже без него.
 */
export async function writeMaintainerDocs(dir: string): Promise<void> {
  const docs = join(dir, 'apps/docs')
  await mkdir(join(docs, 'guide/maintainer'), { recursive: true })
  await writeFile(join(docs, 'guide/maintainer/index.md'), '# Ветки шаблона\n')
  await appendFile(join(docs, '.vitepress/config/ru.ts'), [
    `      {`,
    `        text: 'Для мейнтейнера',`,
    `        items: [`,
    `          { text: 'Ветки шаблона', link: '/guide/maintainer/' },`,
    `          { text: 'Релизы', link: '/guide/maintainer/release' },`,
    `        ],`,
    `      },`,
    '',
  ].join('\n'))
}
