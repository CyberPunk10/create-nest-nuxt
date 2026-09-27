/**
 * Приводит скачанный шаблон к виду нового проекта: имя, чистая версия,
 * без следов авторства шаблона.
 * @module
 */

import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Поля, которые описывают шаблон, а не проект пользователя. license
 * удаляется намеренно: MIT здесь принадлежит автору шаблона, и наследовать
 * его в чужом проекте неуместно.
 */
const TEMPLATE_FIELDS = ['author', 'license', 'keywords', 'description']

/**
 * Файлы, которые принадлежат шаблону, а не проекту. LICENSE объявляет
 * правообладателем автора шаблона — в чужом проекте это неуместно.
 */
const TEMPLATE_FILES = ['LICENSE']

/**
 * Удаляет лишние файлы шаблона, выставляет имя и версию `0.0.0` в корневом
 * package.json и убирает из него поля, описывающие шаблон.
 * @param dir Папка со скачанным шаблоном.
 * @param projectName Имя пакета для поля `name`.
 */
export async function personalize(dir: string, projectName: string): Promise<void> {
  for (const file of TEMPLATE_FILES) {
    await rm(join(dir, file), { force: true })
  }

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
