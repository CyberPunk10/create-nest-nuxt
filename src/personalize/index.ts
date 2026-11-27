/**
 * Приводит скачанный шаблон к виду нового проекта: имя, чистая версия, один
 * язык документации без раздела для мейнтейнера, без следов авторства
 * шаблона. Каждый этап — в своём файле этой папки.
 * @module
 */

import type { Locale } from '../i18n.ts'
import { keepDocsLanguage } from './keep-docs-language.ts'
import { removeMaintainerDocs } from './remove-maintainer-docs.ts'
import { removeTemplateFiles } from './remove-template-files.ts'
import { updatePackageJson } from './update-package-json.ts'

/**
 * @param dir Папка со скачанным шаблоном.
 * @param projectName Имя пакета для поля `name`.
 * @param locale Язык, на котором остаётся документация; записывается и в
 *   паспорт проекта (`templateOrigin` в package.json).
 */
export async function personalize(dir: string, projectName: string, locale: Locale): Promise<void> {
  await removeTemplateFiles(dir)
  await removeMaintainerDocs(dir)
  await keepDocsLanguage(dir, locale)
  await updatePackageJson(dir, projectName, locale)
}
