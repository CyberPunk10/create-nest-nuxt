/**
 * Папка, в которую разворачивается проект: что в ней уже лежит и как её
 * очистить. Отдельно от вопросов и скачивания, чтобы это можно было
 * проверить тестами на настоящей файловой системе.
 * @module
 */

import { readdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { UserError } from './errors.ts'
import type { Messages } from './i18n.ts'

/**
 * Что делать с содержимым непустой папки: `remove` — очистить перед
 * скачиванием (кроме .git), `keep` — распаковать шаблон поверх.
 */
export type OverwriteAction = 'remove' | 'keep'

/** Все значения {@link OverwriteAction} — для флага `--overwrite`. */
export const OVERWRITE_ACTIONS: readonly OverwriteAction[] = ['remove', 'keep']

/**
 * Папка, где лежит только .git, считается пустой — как у create-vite. Это
 * частый сценарий: создал пустой репозиторий, склонировал, запустил
 * генератор с «.». Перезаписывать там нечего, спрашивать незачем.
 * @returns true и для несуществующей папки — её создаст скачивание.
 * @throws {UserError} Если по этому пути лежит файл, а не папка.
 */
export async function isEmptyDir(dir: string, messages: Messages): Promise<boolean> {
  try {
    if (!(await stat(dir)).isDirectory()) throw new UserError(messages.notADirectory(dir))
  } catch (error) {
    if (error instanceof UserError) throw error
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true
    throw error
  }

  const entries = await readdir(dir)
  return entries.every(entry => entry === '.git')
}

/**
 * Удаляет всё содержимое папки, кроме .git: человек мог развернуть проект в
 * склонированный репозиторий, и история с remote ему нужны.
 */
export async function emptyDir(dir: string): Promise<void> {
  const entries = await readdir(dir).catch(() => [])
  await Promise.all(entries
    .filter(entry => entry !== '.git')
    .map(entry => rm(join(dir, entry), { recursive: true, force: true })))
}
