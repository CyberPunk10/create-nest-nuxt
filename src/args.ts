/**
 * Аргументы командной строки. Проверяются до диалога.
 * Язык ещё не выбран, поэтому сообщения английские.
 * @module
 */

import { parseArgs } from 'node:util'
import { UserError } from './errors.ts'
import { t } from './i18n.ts'
import { validateProjectName } from './project-name.ts'
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
  /** Передан `--help` / `-h`. */
  help?: true
  /** Передан `--version` / `-v`. */
  version?: true
}

/** Текст для `--help`. */
export function usage(): string {
  return [
    'Usage: create-nest-nuxt [project-name] [options]',
    '',
    'Options:',
    `  --variant <name>  ${variantValues().join(', ')}`,
    '  -h, --help        show this help',
    '  -v, --version     show version',
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
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
      allowPositionals: true,
    })
  }
  catch (error) {
    throw new UserError((error as Error).message, { cause: error })
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
 * @throws {UserError} Неизвестный флаг, флаг без значения, неизвестный
 *   вариант, лишний позиционный аргумент, недопустимое название.
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

  const { variant } = values

  if (variant !== undefined && !isVariant(variant)) {
    throw new UserError([
      messages.unknownVariant(variant),
      messages.expectedOneOf(variantValues().join(', ')),
    ].join('\n'))
  }

  const nameError = validateProjectName(name, messages)
  if (nameError) throw new UserError(nameError)

  return { name, variant }
}
