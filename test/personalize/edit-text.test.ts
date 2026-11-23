import { describe, expect, test } from 'vitest'
import { removeOnce, replaceLinks, replaceOnce } from '../../src/personalize/edit-text.ts'

describe('replaceOnce', () => {
  test('заменяет единственное вхождение', () => {
    expect(replaceOnce('a x b', 'x', 'y')).toBe('a y b')
  })

  test('падает, если вхождений больше одного', () => {
    expect(() => replaceOnce('x x', 'x', 'y')).toThrow('found 2 times, expected once')
  })

  test('падает, если строка не нашлась', () => {
    expect(() => replaceOnce('a b', 'x', 'y')).toThrow('found 0 times, expected once')
  })
})

describe('removeOnce', () => {
  test('удаляет единственное вхождение', () => {
    expect(removeOnce('a\nx\nb\n', 'x\n')).toBe('a\nb\n')
  })

  test('падает, если строка не нашлась', () => {
    expect(() => removeOnce('a b', 'x')).toThrow('found 0 times, expected once')
  })
})

describe('replaceLinks', () => {
  test('заменяет все вхождения, сколько бы их ни было', () => {
    expect(replaceLinks(`link: '/en/a', link: '/en/b'`, `link: '/en/`, `link: '/`)).toBe(`link: '/a', link: '/b'`)
  })

  test('падает, если не нашлось ни одного', () => {
    expect(() => replaceLinks('nothing', `link: '/en/`, `link: '/`)).toThrow('not found')
  })
})
