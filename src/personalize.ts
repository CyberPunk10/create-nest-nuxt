/**
 * Приводит скачанный шаблон к виду нового проекта: имя, чистая версия,
 * без следов авторства шаблона.
 * @module
 */

import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type Locale, locales } from './i18n.ts'

/**
 * Поля, которые описывают шаблон, а не проект пользователя. license
 * удаляется намеренно: MIT здесь принадлежит автору шаблона, и наследовать
 * его в чужом проекте неуместно.
 */
const TEMPLATE_FIELDS = ['author', 'license', 'keywords', 'description']

/**
 * Что убираем из скачанного шаблона, чтобы разработчик получил чистый проект
 * для старта, без служебных файлов самого шаблона:
 * - LICENSE — лицензия автора шаблона, у проекта будет своя;
 * - .github — CI, который проверяет ветки шаблона;
 * - scripts/tests — тесты скриптов шаблона, их запускает только этот CI.
 */
const TEMPLATE_FILES = ['LICENSE', '.github', 'scripts/tests']

/**
 * Документация шаблона на всех языках CLI: русская лежит в корне
 * `apps/docs`, остальные — в подпапках с кодом языка (`apps/docs/en`).
 */
const DOCS = 'apps/docs'
const DOCS_ROOT_LOCALE: Locale = 'ru'

/** Страницы, из которых состоит документация на одном языке. */
const DOCS_PAGES = ['index.md', 'guide']

/**
 * Удаляет лишние файлы шаблона, оставляет документацию на одном языке,
 * выставляет имя и версию `0.0.0` в корневом package.json и убирает из него
 * поля, описывающие шаблон.
 * @param dir Папка со скачанным шаблоном.
 * @param projectName Имя пакета для поля `name`.
 * @param locale Язык, на котором остаётся документация.
 */
export async function personalize(dir: string, projectName: string, locale: Locale): Promise<void> {
  for (const file of TEMPLATE_FILES) {
    await rm(join(dir, file), { recursive: true, force: true })
  }

  await keepDocsLanguage(dir, locale)

  const path = join(dir, 'package.json')
  const raw = await readFile(path, 'utf8')
  const pkg = JSON.parse(raw) as Record<string, unknown>

  pkg.name = projectName
  pkg.version = '0.0.0'

  for (const field of TEMPLATE_FIELDS) delete pkg[field]

  // Отступ берём из исходника, чтобы не переформатировать файл целиком:
  // diff первого коммита пользователя должен быть про его проект. Строкой,
  // а не числом: так сохраняются и пробелы, и табы.
  const indent = raw.match(/\n([ \t]+)"/)?.[1] ?? 2

  await writeFile(path, JSON.stringify(pkg, null, indent) + '\n')
}

/**
 * Оставляет документацию на одном языке и кладёт её в корень `apps/docs`:
 * в проекте язык один, и префикс `/en/` в адресах ему ни к чему.
 */
async function keepDocsLanguage(dir: string, locale: Locale): Promise<void> {
  const docs = join(dir, DOCS)

  if (locale !== DOCS_ROOT_LOCALE) {
    for (const page of DOCS_PAGES) {
      await rm(join(docs, page), { recursive: true, force: true })
      await rename(join(docs, locale, page), join(docs, page))
    }
  }

  for (const { value } of locales) {
    if (value !== DOCS_ROOT_LOCALE) await rm(join(docs, value), { recursive: true, force: true })
  }
}
