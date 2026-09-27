import { describe, expect, test } from 'vitest'
import { locales, t } from '../src/i18n.ts'
import { getVariants, variantValues } from '../src/variants.ts'

// Что ключи и типы всех словарей совпадают с английским, проверяет tsc
// (dict: Record<Locale, Messages>). Здесь — то, чего он не видит.

test('английский словарь описывает каждый вариант', () => {
  // variantHints и список вариантов объявлены в разных местах, и tsc не
  // связывает их между собой: новый вариант без пояснения он пропустит.
  expect(Object.keys(t('en').variantHints).sort()).toEqual(variantValues().sort())
})

describe.each(locales.map(l => l.value))('пояснения к вариантам: %s', (locale) => {
  const hints = getVariants(locale).map(v => v.hint)

  test('у каждого варианта своё непустое пояснение', () => {
    expect(hints.every(hint => hint.trim() !== '')).toBe(true)
    expect(new Set(hints).size).toBe(hints.length)
  })

  test.skipIf(locale === 'en')('переведены, а не скопированы с английского', () => {
    const english = getVariants('en').map(v => v.hint)
    expect(hints.filter((hint, i) => hint === english[i])).toEqual([])
  })
})

describe('неизвестный язык откатывается на английский', () => {
  test.each(['xx', '', 'toString', 'constructor', '__proto__'])('%j', (locale) => {
    expect(t(locale)).toBe(t('en'))
  })
})
