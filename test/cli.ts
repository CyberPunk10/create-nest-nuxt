import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json' with { type: 'json' }

/** Корень пакета. */
export const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Путь из `bin` — то, что запустит npx. */
export const BIN = pkg.bin['create-nest-nuxt']

/**
 * Запускает собранный CLI напрямую, без `node` перед ним, — как npx: так
 * проверяются и shebang, и право на исполнение. stdin — не терминал, как в
 * CI, поэтому все ответы должны прийти аргументами. Свежую сборку делает
 * test/build.ts.
 */
export function run(args: string[], cwd = ROOT) {
  const { status, stdout, stderr } = spawnSync(`${ROOT}/${BIN}`, args, { cwd, encoding: 'utf8' })
  return { status, stdout, stderr }
}
