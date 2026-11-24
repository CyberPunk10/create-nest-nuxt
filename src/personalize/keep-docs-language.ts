import { rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { type Locale, locales } from '../i18n.ts'
import { editFile, removeOnce, replaceLinks, replaceOnce } from './edit-text.ts'

/**
 * Документация шаблона на всех языках CLI: русская лежит в корне
 * `apps/docs`, остальные — в подпапках с кодом языка (`apps/docs/en`).
 */
const DOCS = 'apps/docs'
const DOCS_ROOT_LOCALE: Locale = 'ru'

/** Страницы, из которых состоит документация на одном языке. */
const DOCS_PAGES = ['index.md', 'guide']

/**
 * Оставляет документацию на одном языке и кладёт её в корень `apps/docs`:
 * в проекте язык один, и префикс `/en/` в адресах ему ни к чему.
 *
 * Конфиг VitePress правится заменой целых строк, каждая из которых
 * встречается ровно раз; ссылки сайдбара — по префиксу. Разошлось —
 * генератор падает, а не отдаёт проект с документацией, которая не
 * собирается или собирается не так.
 */
export async function keepDocsLanguage(dir: string, locale: Locale): Promise<void> {
  // Папка документации, папка конфига VitePress в ней и коды языков, которые
  // удаляются, — все, кроме выбранного (например для en: ru и th).
  const docs = join(dir, DOCS)
  const vitepress = join(docs, '.vitepress')
  const others = locales.map(l => l.value).filter(value => value !== locale)

  // 1. config.ts — общий конфиг, языки перечислены в нём. Пример для en:
  //   import ru from './config/ru'                  → строка удалена
  //   import th from './config/th'                  → строка удалена
  //   import en from './config/en'                  → остаётся
  //   const LOCALES: LocaleEntry[] = [ru, en, th]   → [en]
  //   import homeLocale from './locales/ru.json'    → './locales/en.json'
  // Последний импорт нужен только ради типа переводов главной, но ru.json
  // будет удалён, поэтому тип берётся из файла оставшегося языка.
  await editFile(join(vitepress, 'config.ts'), (text) => {
    for (const other of others) {
      text = removeOnce(text, `import ${other} from './config/${other}'\n`)
    }
    text = replaceOnce(
      text,
      'const LOCALES: LocaleEntry[] = [ru, en, th]\n',
      `const LOCALES: LocaleEntry[] = [${locale}]\n`,
    )
    return replaceOnce(
      text,
      `import homeLocale from './locales/${DOCS_ROOT_LOCALE}.json'\n`,
      `import homeLocale from './locales/${locale}.json'\n`,
    )
  })

  // 2. Конфиг выбранного языка правится, только если язык не русский:
  // русский в шаблоне уже корневой. Пример для en, файл config/en.ts:
  //   key: 'en',                                 → key: 'root',
  //   link: '/en/guide/getting-started/setup'    → link: '/guide/getting-started/setup'
  // Конфиги остальных языков не правятся — они удаляются целиком в шаге 3.
  if (locale !== DOCS_ROOT_LOCALE) {
    await editFile(join(vitepress, 'config', `${locale}.ts`), (text) => {
      text = replaceOnce(
        text,
        `  key: '${locale}',\n`,
        `  key: 'root',\n`,
      )
      text = replaceLinks(
        text,
        `link: '/${locale}/`,
        `link: '/`,
      )
      // Ссылок сайдбара столько, сколько страниц, поэтому их число не
      // проверяется. Зато префикс языка не должен остаться нигде: если он
      // есть в другом месте, туда нужна своя замена.
      if (text.includes(`/${locale}/`)) {
        throw new Error(`Template mismatch: /${locale}/ left in config/${locale}.ts outside sidebar links`)
      }
      return text
    })
  }

  // 3. Файлы остальных языков удаляются целиком. Пример для en:
  // config/ru.ts, config/th.ts, locales/ru.json, locales/th.json.
  for (const other of others) {
    await rm(join(vitepress, 'config', `${other}.ts`))
    await rm(join(vitepress, 'locales', `${other}.json`))
  }

  // 4. Страницы выбранного языка переезжают в корень на место русских.
  // Пример для en: удаляются index.md и guide/ в корне, на их место
  // переносятся en/index.md и en/guide/. Для русского шаг не нужен.
  if (locale !== DOCS_ROOT_LOCALE) {
    for (const page of DOCS_PAGES) {
      await rm(join(docs, page), { recursive: true, force: true })
      await rename(join(docs, locale, page), join(docs, page))
    }
  }

  // 5. Папки языков удаляются: у выбранного она после шага 4 пуста,
  // у остальных там страницы, которые не нужны. Пример для en: en/ и th/.
  for (const { value } of locales) {
    if (value !== DOCS_ROOT_LOCALE) await rm(join(docs, value), { recursive: true, force: true })
  }
}
