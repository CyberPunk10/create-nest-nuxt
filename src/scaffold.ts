/**
 * Разворачивает проект: скачивает выбранную ветку шаблона и приводит её к
 * виду нового проекта. Вопросов здесь нет — только спиннер на время работы.
 * @module
 */

import { existsSync } from 'node:fs'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { spinner } from '@clack/prompts'
import { downloadTemplate } from 'giget'
import { UserError } from './errors.ts'
import type { Messages } from './i18n.ts'
import { personalize } from './personalize.ts'
import type { OverwriteAction } from './prompts.ts'
import { TEMPLATE_REPO, type Variant } from './variants.ts'

/** Что и куда разворачивать — ответы на вопросы. */
export interface ScaffoldOptions {
  /** Абсолютный путь к папке проекта. */
  dir: string
  /** Ветка шаблона. */
  variant: Variant
  /** Имя для поля `name` package.json. */
  packageName: string
  /** Ответ на вопрос о непустой папке. */
  overwrite: OverwriteAction
}

/**
 * Удаляет всё содержимое папки, кроме .git: человек мог развернуть проект в
 * склонированный репозиторий, и история с remote ему нужны.
 */
async function emptyDir(dir: string): Promise<void> {
  if (!existsSync(dir)) return
  for (const entry of await readdir(dir)) {
    if (entry === '.git') continue
    await rm(join(dir, entry), { recursive: true, force: true })
  }
}

/**
 * Скачивает шаблон в папку и персонализирует его.
 * @throws {UserError} Если скачать не удалось.
 */
export async function scaffold(
  { dir, variant, packageName, overwrite }: ScaffoldOptions,
  messages: Messages,
): Promise<void> {
  const s = spinner()
  s.start(messages.downloading)

  if (overwrite === 'remove') await emptyDir(dir)

  try {
    await downloadTemplate(`gh:${TEMPLATE_REPO}#${variant}`, {
      dir,
      force: true,
    })
  } catch (error) {
    s.stop(messages.downloadFailed)
    // Частый случай — нет сети или GitHub недоступен: сообщение giget
    // понятнее любого нашего пересказа.
    throw new UserError((error as Error).message, { cause: error })
  }

  await personalize(dir, packageName)
  s.stop(messages.ready)
}
