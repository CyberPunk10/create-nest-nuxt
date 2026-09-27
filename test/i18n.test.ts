import { describe, expect, test } from 'vitest'
import { locales, type Messages, t } from '../src/i18n.ts'
import { getVariants, variantValues } from '../src/variants.ts'

// Английский словарь — эталон. Если в другой язык забыли добавить
// сообщение, CLI покажет вместо него undefined, и заметит это только тот,
// кто выберет этот язык. Поэтому ключи каждого словаря сверяются с
// английским.
const reference = t('en')
const others = locales.map(l => l.value).filter(v => v !== 'en')

describe.each(others)('словарь %s', (locale) => {
  const dict = t(locale)

  test('набор ключей совпадает с английским', () => {
    expect(Object.keys(dict).sort()).toEqual(Object.keys(reference).sort())
  })

  test('функции остаются функциями, строки — строками', () => {
    for (const [key, value] of Object.entries(reference)) {
      expect(typeof dict[key as keyof Messages], key).toBe(typeof value)
    }
  })

  test('пояснение есть у каждого варианта', () => {
    expect(Object.keys(dict.variantHints).sort()).toEqual(variantValues().sort())
  })
})

test('английский словарь описывает каждый вариант', () => {
  expect(Object.keys(reference.variantHints).sort()).toEqual(variantValues().sort())
})

test('неизвестный язык откатывается на английский', () => {
  expect(t('xx')).toBe(reference)
})

test('getVariants подставляет пояснение на выбранном языке', () => {
  const first = getVariants('ru')[0]!
  expect(first.hint).toBe(t('ru').variantHints[first.value])
})
