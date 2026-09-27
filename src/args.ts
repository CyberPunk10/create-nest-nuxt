/**
 * Аргументы командной строки. Проверяются до диалога.
 * Язык ещё не выбран, поэтому сообщения английские.
 * @module
 */

import { parseArgs } from 'node:util'
import { UserError } from './errors.ts'
import { isLocale, type Locale, locales, t } from './i18n.ts'
import { validateProjectName } from './project-name.ts'
import { OVERWRITE_ACTIONS, type OverwriteAction } from './target-dir.ts'
import { isVariant, type Variant, variantValues } from './variants.ts'

/**
 * Что пришло из командной строки. При `help` или `version` остальных полей
 * нет: CLI только печатает ответ и выходит.
 */
export interface CliArgs {
  /** Позиционный аргумент — название проекта. */
  name?: string
  /** Значение `--variant`, уже проверенное. */
  variant?: Variant
  /** Значение `--lang`, уже проверенное. */
  lang?: Locale
  /** Значение `--overwrite`, уже проверенное. */
  overwrite?: OverwriteAction
  /** Передан `--help` / `-h`. */
  help?: true
  /** Передан `--version` / `-v`. */
  version?: true
}

function isOverwriteAction(value: string): value is OverwriteAction {
  return (OVERWRITE_ACTIONS as readonly string[]).includes(value)
}

/** Текст для `--help`. */
export function usage(): string {
  return [
    'Usage: create-nest-nuxt [project-name] [options]',
    '',
    'Options:',
    `  --variant <name>      ${variantValues().join(', ')}`,
    `  --lang <code>         ${locales.map(l => l.value).join(', ')}`,
    `  --overwrite <action>  ${OVERWRITE_ACTIONS.join(', ')} — if the folder is not empty`,
    '  -h, --help            show this help',
    '  -v, --version         show version',
    '',
    'Without a terminal (CI, scripts) every answer must come from arguments.',
  ].join('\n')
}

/**
 * Неизвестный флаг или --variant без значения: формулировка parseArgs уже
 * называет, что не так, пересказывать её незачем.
 */
function parse(argv: string[]) {
  try {
    return parseArgs({
      args: argv,
      options: {
        variant: { type: 'string' },
        lang: { type: 'string' },
        overwrite: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
      allowPositionals: true,
    })
  }
  catch (error) {
    throw new UserError(error instanceof Error ? error.message : String(error), { cause: error })
  }
}

/**
 * Разбирает и проверяет аргументы. Вариант можно передать флагом, чтобы не
 * отвечать на вопрос, — через пробел или через «=»:
 *
 *     npx create-nest-nuxt my-app --variant auth-session
 *     npx create-nest-nuxt my-app --variant=auth-session
 *
 * @param argv Аргументы без `node` и пути к скрипту.
 * @throws {UserError} Неизвестный флаг, флаг без значения, неизвестное
 *   значение `--variant` / `--lang` / `--overwrite`, лишний позиционный
 *   аргумент, недопустимое название.
 */
export function readCliArgs(argv: string[]): CliArgs {
  const messages = t('en')
  const { values, positionals } = parse(argv)

  // С --help и --version остальные аргументы не важны: человек спрашивает
  // о самом CLI, а не запускает его.
  if (values.help) return { help: true }
  if (values.version) return { version: true }

  // `create-nest-nuxt my app` без кавычек оболочка передаёт двумя
  // аргументами, и проверка пробелов в названии их не увидит. Молча взять
  // первый — значит создать проект не там, где человек ожидает.
  // Поэтому проверяем, что позиционный аргумент один, иначе ошибка.
  const [name, extra] = positionals
  if (extra !== undefined) {
    throw new UserError([
      messages.unexpectedArgument(extra),
      messages.oneProjectName,
    ].join('\n'))
  }

  const { variant, lang, overwrite } = values

  if (variant !== undefined && !isVariant(variant)) {
    throw new UserError([
      messages.unknownVariant(variant),
      messages.expectedOneOf(variantValues().join(', ')),
    ].join('\n'))
  }

  if (lang !== undefined && !isLocale(lang)) {
    throw new UserError([
      messages.unknownLanguage(lang),
      messages.expectedOneOf(locales.map(l => l.value).join(', ')),
    ].join('\n'))
  }

  if (overwrite !== undefined && !isOverwriteAction(overwrite)) {
    throw new UserError([
      messages.unknownOverwrite(overwrite),
      messages.expectedOneOf(OVERWRITE_ACTIONS.join(', ')),
    ].join('\n'))
  }

  const nameError = validateProjectName(name, messages)
  if (nameError) throw new UserError(nameError)

  return { name, variant, lang, overwrite }
}
