import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Сборка dist перед всеми тестами — см. vitest.config.ts. */
export default function setup(): void {
  const root = fileURLToPath(new URL('..', import.meta.url))
  execFileSync(`${root}/node_modules/.bin/tsdown`, { cwd: root, stdio: 'pipe' })
}
