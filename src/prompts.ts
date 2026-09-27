/**
 * Вопросы пользователю. Порядок, в котором они задаются, — в main() в
 * index.ts; здесь только то, как выглядит и проверяется каждый.
 *
 * Каждый вопрос при отмене бросает {@link CancelledError}.
 * @module
 */

import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { basename } from 'node:path'
import { isCancel, select, text } from '@clack/prompts'
import { CancelledError } from './errors.ts'
import { type Locale, locales, type Messages, t } from './i18n.ts'
import {
  DEFAULT_PROJECT_NAME,
  isValidPackageName,
  packageNameFromDir,
  toPackageName,
  validatePackageName,
  validateProjectName,
} from './project-name.ts'
import { getVariants, type Variant } from './variants.ts'

/**
 * Что делать с содержимым непустой папки: `remove` — очистить перед
 * скачиванием (кроме .git), `keep` — распаковать шаблон поверх.
 */
export type OverwriteAction = 'remove' | 'keep'

/**
 * Отмена по Ctrl+C должна выходить молча, а не стектрейсом. Словарь
 * передаётся параметром: на первом вопросе языка ещё нет, там английский.
 * @param value Ответ clack: значение или символ отмены.
 */
function assertNotCancelled<T>(value: T, messages: Messages): Exclude<T, symbol> {
  if (isCancel(value)) throw new CancelledError(messages.cancelled)
  return value as Exclude<T, symbol>
}

/**
 * Папка, где лежит только .git, считается пустой — как у create-vite. Это
 * частый сценарий: создал пустой репозиторий, склонировал, запустил
 * генератор с «.». Перезаписывать там нечего, спрашивать незачем.
 * @returns true и для несуществующей папки.
 */
async function isEmptyDir(dir: string): Promise<boolean> {
  if (!existsSync(dir)) return true
  const entries = await readdir(dir)
  return entries.every(entry => entry === '.git')
}

/**
 * Вопрос 1, «Language». На английском: язык ещё не выбран, а названия в
 * списке написаны каждое на своём — человек узнаёт себя по ним, а не по
 * тексту вопроса.
 */
export async function askLocale(): Promise<Locale> {
  const value = await select({
    message: 'Language',
    options: [...locales],
    showInstructions: false,
  })
  return assertNotCancelled(value, t('en'))
}

/**
 * Вопрос 2, «Название проекта». Не задаётся, если имя передано аргументом.
 * @param fromArgs Позиционный аргумент командной строки.
 * @returns Путь к папке проекта, как его ввёл пользователь.
 */
export async function askProjectName(messages: Messages, fromArgs?: string): Promise<string> {
  if (fromArgs) return fromArgs

  const value = await text({
    message: messages.projectName,
    placeholder: DEFAULT_PROJECT_NAME,
    defaultValue: DEFAULT_PROJECT_NAME,
    validate: input => validateProjectName(input, messages),
  })
  return assertNotCancelled(value, messages)
}

/**
 * Вопрос 3, «Папка не пуста». Задаётся, только если в папке уже что-то есть,
 * кроме .git. «Отменить» бросает {@link CancelledError}.
 *
 * Сама очистка — в scaffold, а не здесь: иначе отмена на следующем вопросе
 * оставила бы человека с уже удалёнными файлами.
 * @returns Для пустой папки — `keep`.
 */
export async function confirmOverwrite(dir: string, messages: Messages): Promise<OverwriteAction> {
  if (await isEmptyDir(dir)) return 'keep'

  const action = assertNotCancelled(await select<OverwriteAction | 'cancel'>({
    message: messages.notEmpty(basename(dir)),
    options: [
      { value: 'cancel', label: messages.overwriteCancel },
      { value: 'remove', label: messages.overwriteRemove },
      { value: 'keep', label: messages.overwriteKeep },
    ],
    showInstructions: false,
  }), messages)

  if (action === 'cancel') throw new CancelledError(messages.cancelled)
  return action
}

/**
 * Вопрос 4, «Имя пакета». Задаётся, только если имя папки нельзя записать
 * в поле `name` package.json. В ответ по умолчанию подставлен исправленный
 * вариант.
 */
export async function askPackageName(dir: string, messages: Messages): Promise<string> {
  const fromDir = packageNameFromDir(dir)
  if (fromDir) return fromDir

  // Подставляем, только если исправление дало допустимое имя: иначе Enter
  // на пустом поле молча принял бы негодное значение по умолчанию.
  const fixed = toPackageName(basename(dir))
  const fallback = isValidPackageName(fixed) ? fixed : undefined
  const value = await text({
    message: messages.packageName,
    placeholder: fallback,
    defaultValue: fallback,
    validate: input => validatePackageName(input, messages, fallback),
  })
  return assertNotCancelled(value, messages)
}

/**
 * Вопрос 5, «Какой вариант». Не задаётся, если передан `--variant`.
 * @param locale Язык пояснений к вариантам.
 * @param fromArgs Значение `--variant`, уже проверенное.
 */
export async function askVariant(messages: Messages, locale: Locale, fromArgs?: Variant): Promise<Variant> {
  if (fromArgs) return fromArgs

  const value = await select({
    message: messages.variant,
    options: getVariants(locale),
    showInstructions: false,
  })
  return assertNotCancelled(value, messages)
}
