import { rm } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Что убираем из скачанного шаблона, чтобы разработчик получил чистый проект
 * для старта, без служебных файлов самого шаблона:
 * - LICENSE — лицензия автора шаблона, у проекта будет своя;
 * - .github — CI, который проверяет ветки шаблона;
 * - scripts/tests — тесты скриптов шаблона, их запускает только этот CI.
 */
const TEMPLATE_FILES = ['LICENSE', '.github', 'scripts/tests']

/** Удаляет служебные файлы шаблона. */
export async function removeTemplateFiles(dir: string): Promise<void> {
  for (const file of TEMPLATE_FILES) {
    await rm(join(dir, file), { recursive: true, force: true })
  }
}
