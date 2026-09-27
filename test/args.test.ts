import { describe, expect, test } from 'vitest'
import { type CliArgs, readCliArgs, usage } from '../src/args.ts'
import { UserError } from '../src/errors.ts'
import { t } from '../src/i18n.ts'

/** Ошибка, которую бросил readCliArgs; если не бросил — тест падает. */
function errorOf(argv: string[]): Error {
  try {
    readCliArgs(argv)
  }
  catch (error) {
    return error as Error
  }
  throw new Error(`readCliArgs(${JSON.stringify(argv)}) не бросил ошибку`)
}

describe('readCliArgs: допустимые аргументы', () => {
  test.each<[string[], CliArgs]>([
    [[], {}],
    [['my-app'], { name: 'my-app' }],
    [['my-app', '--variant', 'auth-session'], { name: 'my-app', variant: 'auth-session' }],
    [['my-app', '--variant=postgres-prisma'], { name: 'my-app', variant: 'postgres-prisma' }],
    [['--variant', 'main', 'my-app'], { name: 'my-app', variant: 'main' }],
    [['.'], { name: '.' }],
  ])('%j', (argv, expected) => {
    expect(readCliArgs(argv)).toEqual(expected)
  })
})

describe('readCliArgs: --help и --version', () => {
  test.each([['--help'], ['-h']])('%s', (flag) => {
    expect(readCliArgs([flag])).toEqual({ help: true })
  })

  test.each([['--version'], ['-v']])('%s', (flag) => {
    expect(readCliArgs([flag])).toEqual({ version: true })
  })

  test('остальные аргументы при этом не проверяются', () => {
    expect(readCliArgs(['my app', '--variant', 'foo', '--help'])).toEqual({ help: true })
  })

  test('справка перечисляет все варианты', () => {
    expect(usage()).toContain('main, auth-session, postgres-prisma')
  })
})

describe('readCliArgs: ошибки — UserError', () => {
  test('неизвестный вариант — с перечнем допустимых', () => {
    const error = errorOf(['--variant', 'foo'])
    expect(error).toBeInstanceOf(UserError)
    expect(error.message).toBe(
      'Unknown variant: foo\nExpected one of: main, auth-session, postgres-prisma',
    )
  })

  test('пустой --variant= — тоже неизвестный вариант', () => {
    expect(errorOf(['--variant=']).message).toMatch(/^Unknown variant: \n/)
  })

  test('неизвестный флаг', () => {
    const error = errorOf(['--foo'])
    expect(error).toBeInstanceOf(UserError)
    expect(error.message).toContain('Unknown option \'--foo\'')
  })

  test('--variant без значения', () => {
    expect(errorOf(['my-app', '--variant']).message).toContain('argument missing')
  })

  test('название без кавычек, разбитое оболочкой на два аргумента', () => {
    const error = errorOf(['my', 'app'])
    expect(error).toBeInstanceOf(UserError)
    expect(error.message).toBe(
      'Unexpected argument: app\nOnly one project name is allowed, without spaces',
    )
  })

  test('пробел в названии', () => {
    expect(errorOf(['my app']).message).toBe(t('en').noSpaces)
  })
})
