/**
 * Приводит скачанный шаблон к виду нового проекта: имя, чистая версия, один
 * язык документации, без следов авторства шаблона. Каждый этап — в своём
 * файле этой папки.
 * @module
 */

import type { Locale } from '../i18n.ts'
import { keepDocsLanguage } from './keep-docs-language.ts'
import { removeTemplateFiles } from './remove-template-files.ts'
import { updatePackageJson } from './update-package-json.ts'

/**
 * @param dir Папка со скачанным шаблоном.
 * @param projectName Имя пакета для поля `name`.
 * @param locale Язык, на котором остаётся документация.
 */
export async function personalize(dir: string, projectName: string, locale: Locale): Promise<void> {
  await removeTemplateFiles(dir)
  await keepDocsLanguage(dir, locale)
  await updatePackageJson(dir, projectName)
}
