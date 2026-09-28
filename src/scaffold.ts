/**
 * Разворачивает проект: скачивает выбранную ветку шаблона и приводит её к
 * виду нового проекта. Вопросов здесь нет — только спиннер на время работы.
 * @module
 */

import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spinner } from '@clack/prompts'
import { downloadTemplate } from 'giget'
import { UserError } from './errors.ts'
import type { Messages } from './i18n.ts'
import { personalize } from './personalize.ts'
import { emptyDir, type OverwriteAction } from './target-dir.ts'
import { TEMPLATE_REPO, templateRef, type Variant } from './variants.ts'

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
 * Скачивает шаблон и переносит его в папку проекта.
 *
 * Шаблон сначала скачивается и персонализируется во временной папке, и
 * только потом трогается папка проекта. Иначе при «Удалить файлы и
 * продолжить» без сети человек остался бы без своих файлов и без проекта, а
 * Ctrl+C посреди скачивания оставлял бы в ней недокачанный шаблон.
 * Персонализация во временной папке заодно не трогает файлы человека при
 * «Оставить файлы»: его собственный LICENSE остаётся на месте.
 * @throws {UserError} Если скачать не удалось; папка проекта при этом не
 *   меняется.
 */
export async function scaffold(
  { dir, variant, packageName, overwrite }: ScaffoldOptions,
  messages: Messages,
): Promise<void> {
  const s = spinner()
  s.start(messages.downloading)

  const staging = await mkdtemp(join(tmpdir(), 'create-nest-nuxt-'))
  try {
    try {
      await downloadTemplate(`gh:${TEMPLATE_REPO}#${templateRef(variant)}`, { dir: staging, force: true })
    } catch (error) {
      s.stop(messages.downloadFailed)
      // Частый случай — нет сети или GitHub недоступен: сообщение giget
      // понятнее любого нашего пересказа.
      throw new UserError(error instanceof Error ? error.message : String(error), { cause: error })
    }

    await personalize(staging, packageName)

    if (overwrite === 'remove') await emptyDir(dir)
    await cp(staging, dir, { recursive: true, force: true })
  } finally {
    await rm(staging, { recursive: true, force: true })
  }

  s.stop(messages.ready)
}
