import { describe, expect, test } from 'vitest'
import { TEMPLATE_VERSION, templateRef } from '../src/variants.ts'

describe('templateRef — что скачивать', () => {
  test('по умолчанию — тег релиза, с которым проверен генератор', () => {
    expect(templateRef('auth-session', TEMPLATE_VERSION)).toBe(`auth-session@${TEMPLATE_VERSION}`)
  })

  test('другая версия — тег этой версии', () => {
    expect(templateRef('main', '0.9.0')).toBe('main@0.9.0')
  })

  test('branch — голова ветки', () => {
    expect(templateRef('postgres-prisma', 'branch')).toBe('postgres-prisma')
  })
})
