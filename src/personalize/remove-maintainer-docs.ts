import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { editFile, removeOnce } from './edit-text.ts'

/** Раздел документации для мейнтейнера шаблона: есть только на русском. */
const MAINTAINER_PAGES = 'apps/docs/guide/maintainer'

/** Конфиг русской документации, где у раздела своя группа в сайдбаре. */
const RU_CONFIG = 'apps/docs/.vitepress/config/ru.ts'

/** Группа сайдбара целиком, как она написана в шаблоне. */
const SIDEBAR_GROUP = [
  `      {`,
  `        text: 'Для мейнтейнера',`,
  `        items: [`,
  `          { text: 'Ветки шаблона', link: '/guide/maintainer/' },`,
  `          { text: 'Релизы', link: '/guide/maintainer/release' },`,
  `        ],`,
  `      },`,
  '',
].join('\n')

/**
 * Удаляет раздел документации для мейнтейнера: как вести ветки и выпускать
 * релизы шаблона. Разработчику проекта это не нужно.
 *
 * Запускается до `keepDocsLanguage`: после удаления раздела страницы
 * на всех языках совпадают, и это там проверяется.
 */
export async function removeMaintainerDocs(dir: string): Promise<void> {
  // Без force: если папки нет, шаблон изменился и генератор падает.
  await rm(join(dir, MAINTAINER_PAGES), { recursive: true })

  await editFile(join(dir, RU_CONFIG), (text) => {
    text = removeOnce(text, SIDEBAR_GROUP)
    // Ссылка на раздел не должна остаться нигде: если она есть в другом
    // месте конфига, туда нужна своя правка.
    if (text.includes('/guide/maintainer')) {
      throw new Error(`Template mismatch: /guide/maintainer left in ${RU_CONFIG}`)
    }
    return text
  })
}
