/**
 * Подсказка «Дальше»: какие команды выполнить, чтобы запустить проект.
 * @module
 */

import process from 'node:process'
import { note } from '@clack/prompts'
import type { Messages } from './i18n.ts'

/**
 * Показывает команды для запуска проекта. `cd` пропускается, если проект
 * развёрнут в текущей папке.
 * @param dir Абсолютный путь к проекту.
 * @param target Путь, как его ввёл пользователь, — он и попадёт в `cd`.
 */
export function showNextSteps(dir: string, target: string, messages: Messages): void {
  // При «.» проект уже в текущей папке, и `cd .` в подсказке только путает.
  const inPlace = dir === process.cwd()

  note(
    [
      ...(inPlace ? [] : [`cd ${target}`]),
      'pnpm install',
      'pnpm dev',
    ].join('\n'),
    messages.nextSteps,
  )
}
