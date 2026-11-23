/**
 * Правка текстовых файлов шаблона заменой строк. Каждая замена сверяет, что
 * нашла ожидаемое: если шаблон изменился, генератор падает, а не отдаёт
 * проект, правленный наугад.
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises'

export async function editFile(path: string, edit: (text: string) => string): Promise<void> {
  await writeFile(path, edit(await readFile(path, 'utf8')))
}

/**
 * Заменяет строку, которая должна встретиться ровно один раз: строка импорта,
 * объявление, ключ. Если её нет или она нашлась ещё где-то, генератор падает,
 * а не правит наугад.
 */
export function replaceOnce(text: string, search: string, replacement: string): string {
  const found = text.split(search).length - 1
  if (found !== 1) {
    throw new Error(`Template mismatch: ${search} found ${found} times, expected once`)
  }
  return text.replace(search, () => replacement)
}

/** Удаляет строку, которая должна встретиться ровно один раз. */
export function removeOnce(text: string, search: string): string {
  return replaceOnce(text, search, '')
}

/** Заменяет все вхождения; хотя бы одно обязано быть. */
export function replaceLinks(text: string, search: string, replacement: string): string {
  if (!text.includes(search)) throw new Error(`Template mismatch: ${search} not found`)
  return text.replaceAll(search, replacement)
}
