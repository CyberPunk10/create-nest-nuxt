/**
 * Вопросы пользователю. Порядок, в котором они задаются, — в main() в
 * index.ts; здесь только то, как выглядит и проверяется каждый.
 *
 * Каждый вопрос при отмене бросает {@link CancelledError}. Если ответ передан
 * аргументом, вопрос не задаётся; если спросить нельзя (нет терминала), а
 * ответа в аргументах нет — {@link UserError} с подсказкой, какой флаг нужен.
 * @module
 */

import { basename } from 'node:path'
import process from 'node:process'
import { isCancel, select, text } from '@clack/prompts'
import { CancelledError, UserError } from './errors.ts'
import { type Locale, locales, type Messages, t } from './i18n.ts'
import {
  DEFAULT_PROJECT_NAME,
  isValidPackageName,
  packageNameFromDir,
  toPackageName,
  validatePackageName,
  validateProjectName,
} from './project-name.ts'
import { isEmptyDir, OVERWRITE_ACTIONS, type OverwriteAction } from './target-dir.ts'
import { getVariants, type Variant, variantValues } from './variants.ts'

/**
 * Можно ли задавать вопросы. В CI, скриптах и при перенаправленном вводе
 * stdin — не терминал: ответить некому, и clack ждал бы ответа вечно.
 */
function canAsk(): boolean {
  return process.stdin.isTTY === true
}

/** Без терминала вопрос не задать — объясняем, каким флагом дать ответ. */
function requireTerminal(messages: Messages, flag: string): void {
  if (!canAsk()) throw new UserError(messages.needsFlag(flag))
}

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
 * Вопрос 1, «Language». Не задаётся, если передан `--lang`. На английском: язык ещё не выбран, а названия в
 * списке написаны каждое на своём — человек узнаёт себя по ним, а не по
 * тексту вопроса.
 */
export async function askLocale(fromArgs?: Locale): Promise<Locale> {
  if (fromArgs) return fromArgs
  requireTerminal(t('en'), `--lang ${locales.map(l => l.value).join('|')}`)

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
  requireTerminal(messages, '<project-name>')

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
 * кроме .git, и если не передан `--overwrite`. «Отменить» бросает
 * {@link CancelledError}.
 *
 * Сама очистка — в scaffold, а не здесь: иначе отмена на следующем вопросе
 * оставила бы человека с уже удалёнными файлами.
 * @returns Для пустой папки — `keep`.
 */
export async function confirmOverwrite(
  dir: string,
  messages: Messages,
  fromArgs?: OverwriteAction,
): Promise<OverwriteAction> {
  if (await isEmptyDir(dir, messages)) return 'keep'
  if (fromArgs) return fromArgs
  requireTerminal(messages, `--overwrite ${OVERWRITE_ACTIONS.join('|')}`)

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
 * вариант; без терминала он и берётся.
 */
export async function askPackageName(dir: string, messages: Messages): Promise<string> {
  const fromDir = packageNameFromDir(dir)
  if (fromDir) return fromDir

  // Подставляем, только если исправление дало допустимое имя: иначе Enter
  // на пустом поле молча принял бы негодное значение по умолчанию.
  const fixed = toPackageName(basename(dir))
  const fallback = isValidPackageName(fixed) ? fixed : undefined
  if (!canAsk()) {
    if (fallback) return fallback
    throw new UserError(messages.noPackageName(basename(dir)))
  }

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
  requireTerminal(messages, `--variant ${variantValues().join('|')}`)

  const value = await select({
    message: messages.variant,
    options: getVariants(locale),
    showInstructions: false,
  })
  return assertNotCancelled(value, messages)
}
