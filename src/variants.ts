/**
 * Варианты шаблона. Каждый живёт в своей ветке репозитория и является
 * самостоятельной точкой старта, а не набором опций поверх общей базы:
 * ветки надстраиваются друг над другом (main → auth-session →
 * postgres-prisma), но пользователь получает ровно одну.
 * @module
 */

import process from 'node:process'
import { type Locale, t } from './i18n.ts'

/** Репозиторий шаблона на GitHub в формате giget: `владелец/имя`. */
export const TEMPLATE_REPO = 'CyberPunk10/template-nest-nuxt'

/**
 * Версия шаблона, которую скачивает генератор.
 *
 * У каждого релиза шаблона свой тег для каждого варианта, например
 * `auth-session@0.1.0`. Генератор скачивает по тегу, а не последнее состояние
 * ветки, поэтому одна и та же версия генератора всегда создаёт одинаковый
 * проект — даже если в шаблон потом добавили новые коммиты.
 *
 * Чтобы пользователи получили новый релиз шаблона, эту константу поднимают
 * и выпускают новую версию генератора.
 */
export const TEMPLATE_VERSION = '0.1.0'

/**
 * Что скачать для варианта: тег релиза (`auth-session@0.1.0`) или ветку
 * (`auth-session`) в её самом последнем состоянии.
 *
 * По умолчанию — тег версии {@link TEMPLATE_VERSION}. Переменная окружения
 * CNN_TEMPLATE_VERSION нужна для проверок, пользователю она ни к чему:
 * - `CNN_TEMPLATE_VERSION=branch` — последнее состояние веток. Так до релиза
 *   шаблона можно проверить, что генератор работает с его новыми правками;
 * - `CNN_TEMPLATE_VERSION=0.2.0` — другой релиз шаблона.
 */
export function templateRef(
  variant: Variant,
  version = process.env.CNN_TEMPLATE_VERSION || TEMPLATE_VERSION,
): string {
  return version === 'branch' ? variant : `${variant}@${version}`
}

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
