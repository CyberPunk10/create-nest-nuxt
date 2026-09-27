#!/usr/bin/env node

/**
 * create-nest-nuxt — разворачивает монорепо NestJS + Nuxt 4 из шаблона.
 *
 * Шаблон живёт не здесь: giget скачивает выбранную ветку с GitHub, поэтому
 * пакет остаётся крошечным, а пользователь всегда получает актуальный код.
 * @module
 */

import { resolve } from 'node:path'
import process from 'node:process'
import { cancel, intro, outro } from '@clack/prompts'
import pkg from '../package.json' with { type: 'json' }
import { readCliArgs, usage } from './args.ts'
import { CancelledError, UserError } from './errors.ts'
import { t } from './i18n.ts'
import { showNextSteps } from './next-steps.ts'
import {
  askLocale,
  askPackageName,
  askProjectName,
  askVariant,
  confirmOverwrite,
} from './prompts.ts'
import { scaffold } from './scaffold.ts'

/** Сценарий CLI: вопросы по порядку, затем скачивание и подсказка по запуску */
async function main(): Promise<void> {
  // Бросает UserError, если аргументы неверные.
  const args = readCliArgs(process.argv.slice(2))

  if (args.help) {
    console.log(usage())
    return
  }
  if (args.version) {
    console.log(pkg.version)
    return
  }

  intro('create-nest-nuxt')

  // Вопрос 1. «Language» — на английском, пропускается, если передан --lang
  const locale = await askLocale(args.lang)
  const messages = t(locale)

  // Вопрос 2. «Название проекта» — пропускается, если имя передано аргументом
  const target = await askProjectName(messages, args.name)
  const dir = resolve(target)

  // Вопрос 3. «Папка … не пуста. Что сделать?» — только если в папке есть
  // что-то кроме .git и не передан --overwrite
  const overwrite = await confirmOverwrite(dir, messages, args.overwrite)

  // Вопрос 4. «Имя пакета» — только если имя папки не годится для npm
  const packageName = await askPackageName(dir, messages)

  // Вопрос 5. «Какой вариант?» — пропускается, если передан --variant
  const variant = await askVariant(messages, locale, args.variant)

  // Дальше вопросов нет: скачивание, персонализация, подсказка по запуску
  await scaffold({ dir, variant, packageName, overwrite }, messages)
  showNextSteps(dir, target, messages)

  outro(messages.done)
}

// Единственное место, где процесс завершается: модули только бросают
// ошибки. Отмена — не сбой, поэтому код 0; ошибка пользователя — без
// стектрейса, он ему ничего не скажет; всё остальное — баг, стектрейс нужен.
try {
  await main()
} catch (error) {
  if (error instanceof CancelledError) {
    cancel(error.message)
    process.exit(0)
  }
  console.error(error instanceof UserError ? error.message : error)
  process.exit(1)
}
