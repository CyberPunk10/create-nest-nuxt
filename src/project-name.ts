/**
 * Всё про название проекта и имя пакета: значения по умолчанию, проверка
 * ввода и то, как одно получается из другого. Нужно и разбору аргументов, и
 * вопросам, поэтому живёт отдельно от обоих.
 * @module
 */

import { basename } from 'node:path'
import type { Messages } from './i18n.ts'

/** Имя по умолчанию */
export const DEFAULT_PROJECT_NAME = 'nest-nuxt-app'

/**
 * Правило npm для поля name: строчные буквы, цифры и -._~, опционально
 * scope. То же выражение использует create-vite.
 */
const PACKAGE_NAME = /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/

/** Можно ли записать имя в поле `name` package.json. */
export function isValidPackageName(name: string): boolean {
  return PACKAGE_NAME.test(name)
}

/**
 * Исправленный вариант имени — подставляется как значение по умолчанию в
 * вопрос. Пустой результат значит, что исправлять было нечего */
export function toPackageName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    // «my app» → «my-app», «мой-app» → «----app»: всё, что npm не примет,
    // становится дефисом. @ и / разрешены, чтобы scoped-имя @scope/name
    // осталось целым.
    .replace(/[^a-z0-9\-._~@/]/g, '-')
    // «----app» → «app»: имя не может начинаться с - . _, а на краях
    // такие символы и не нужны — они остаются от заменённых букв.
    .replace(/^[-_.]+|[-_.]+$/g, '')
}

/**
 * Имя пакета берётся из имени папки как есть, если оно допустимо для npm, —
 * тогда вопрос о пакете не задаётся. Иначе undefined: спросим.
 */
export function packageNameFromDir(dir: string): string | undefined {
  const name = basename(dir)
  return isValidPackageName(name) ? name : undefined
}

/**
 * Проверка ответа на вопрос о названии и позиционного аргумента.
 * @returns Текст ошибки или undefined, если всё в порядке.
 */
export function validateProjectName(input: string | undefined, messages: Messages): string | undefined {
  // Пустой ввод заменится на defaultValue, проверять нечего.
  if (!input) return undefined
  if (input.includes(' ')) return messages.noSpaces
  return undefined
}

/**
 * Проверка ответа на вопрос «Имя пакета».
 *
 * Пустой ответ — это Enter без ввода. Он допустим, только если у вопроса есть
 * значение по умолчанию: тогда clack подставит его сам. Если значения по
 * умолчанию нет, пустой ответ отклоняется — иначе имя пакета осталось бы пустым.
 *
 * Проверять приходится здесь: clack вызывает проверку до того, как подставит
 * значение по умолчанию, и видит пустую строку.
 * @param fallback Значение по умолчанию в вопросе, если оно есть.
 * @returns Текст ошибки или undefined, если всё в порядке.
 */
export function validatePackageName(
  input: string | undefined,
  messages: Messages,
  fallback?: string,
): string | undefined {
  if (!input) return fallback ? undefined : messages.packageNameRequired
  return isValidPackageName(input) ? undefined : messages.invalidPackageName
}
