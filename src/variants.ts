/**
 * Варианты шаблона. Каждый живёт в своей ветке репозитория и является
 * самостоятельной точкой старта, а не набором опций поверх общей базы:
 * ветки надстраиваются друг над другом (main → auth-session →
 * postgres-prisma), но пользователь получает ровно одну.
 * @module
 */

import { type Locale, t } from './i18n.ts'

/** Репозиторий шаблона на GitHub в формате giget: `владелец/имя`. */
export const TEMPLATE_REPO = 'CyberPunk10/template-nest-nuxt'

/** Имя ветки, по которому пользователь потом ищет вариант в документации. */
const VARIANTS = [
  { value: 'main', label: 'Base' },
  { value: 'auth-session', label: 'Auth' },
  { value: 'postgres-prisma', label: 'PostgreSQL' },
] as const

/** Имя ветки шаблона. */
export type Variant = (typeof VARIANTS)[number]['value']

/** Варианты для вопроса clack, с пояснением на выбранном языке. */
export function getVariants(locale: Locale): { value: Variant, label: string, hint: string }[] {
  const { variantHints } = t(locale)
  return VARIANTS.map(v => ({ ...v, hint: variantHints[v.value] }))
}

/** Имена всех веток — для справки и сообщений об ошибке. */
export function variantValues(): Variant[] {
  return VARIANTS.map(v => v.value)
}

/** Существует ли такой вариант. */
export function isVariant(value: string): value is Variant {
  return VARIANTS.some(v => v.value === value)
}
