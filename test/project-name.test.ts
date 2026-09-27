import { describe, expect, test } from 'vitest'
import { t } from '../src/i18n.ts'
import {
  DEFAULT_PROJECT_NAME,
  isValidPackageName,
  packageNameFromDir,
  toPackageName,
  validatePackageName,
  validateProjectName,
} from '../src/project-name.ts'

const messages = t('en')

describe('isValidPackageName', () => {
  test.each([
    'nest-nuxt-app',
    'shop',
    'my_app',
    'a.b~c',
    '@scope/pkg',
  ])('принимает %s', (name) => {
    expect(isValidPackageName(name)).toBe(true)
  })

  test.each([
    'My_App',
    'my app',
    '.hidden',
    '_private',
    'Новая',
    '',
  ])('отклоняет %j', (name) => {
    expect(isValidPackageName(name)).toBe(false)
  })

  test('имя по умолчанию само допустимо', () => {
    expect(isValidPackageName(DEFAULT_PROJECT_NAME)).toBe(true)
  })
})

describe('toPackageName', () => {
  test.each([
    ['My_App', 'my_app'],
    ['my app', 'my-app'],
    ['Мой-app', 'app'],
    ['  Shop  ', 'shop'],
    ['@Scope/Pkg', '@scope/pkg'],
  ])('%j → %j', (input, expected) => {
    expect(toPackageName(input)).toBe(expected)
  })

  test('из имени целиком на кириллице ничего не выходит', () => {
    expect(toPackageName('Новая папка')).toBe('')
  })
})

describe('packageNameFromDir', () => {
  test('допустимое имя папки берётся как есть', () => {
    expect(packageNameFromDir('/work/nest-nuxt-app')).toBe('nest-nuxt-app')
  })

  test('недопустимое имя — undefined, чтобы задать вопрос', () => {
    expect(packageNameFromDir('/work/My_App')).toBeUndefined()
    expect(packageNameFromDir('/work/Новая папка')).toBeUndefined()
  })
})

describe('validateProjectName', () => {
  test('пустой ввод пропускается — подставится значение по умолчанию', () => {
    expect(validateProjectName('', messages)).toBeUndefined()
    expect(validateProjectName(undefined, messages)).toBeUndefined()
  })

  test('пробелы запрещены', () => {
    expect(validateProjectName('my app', messages)).toBe(messages.noSpaces)
  })

  test.each(['.', 'my-app', 'Мой-проект', '../sibling'])('принимает %j', (input) => {
    expect(validateProjectName(input, messages)).toBeUndefined()
  })
})

describe('validatePackageName', () => {
  test('пустой ввод допустим, только если есть что подставить', () => {
    expect(validatePackageName('', messages, 'my_app')).toBeUndefined()
    expect(validatePackageName('', messages, undefined)).toBe(messages.packageNameRequired)
  })

  test('недопустимое имя отклоняется', () => {
    expect(validatePackageName('Bad Name', messages, 'x')).toBe(messages.invalidPackageName)
  })

  test('допустимое имя принимается', () => {
    expect(validatePackageName('ok-name', messages)).toBeUndefined()
  })
})
