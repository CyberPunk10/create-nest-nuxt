import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, test } from 'vitest'
import pkg from '../package.json' with { type: 'json' }
import { variantValues } from '../src/variants.ts'

// CLI как чёрный ящик: собранный dist/index.mjs запускается отдельным
// процессом и напрямую, без `node` перед ним, — так же, как его запустит npx.
// Проверяется только то, что видно снаружи: вывод и код выхода. Ловит то,
// чего не видят юнит-тесты: потерянный shebang, файл вне `files`, импорт,
// сломанный сборкой. Сборку перед запуском делает `pnpm test`.
const CLI = fileURLToPath(new URL(`../${pkg.bin['create-nest-nuxt']}`, import.meta.url))

function run(...args: string[]) {
  const { status, stdout, stderr } = spawnSync(CLI, args, { encoding: 'utf8' })
  return { status, stdout, stderr }
}

beforeAll(() => {
  if (!existsSync(CLI)) throw new Error(`${CLI} не найден — сначала pnpm build`)
})

describe('пакет', () => {
  test('bin указывает на файл, который попадёт в npm', () => {
    const entry = pkg.bin['create-nest-nuxt']
    expect(pkg.files.some(path => entry.startsWith(`${path}/`))).toBe(true)
  })
})

describe('флаги без вопросов', () => {
  test('--version печатает версию из package.json', () => {
    expect(run('--version')).toMatchObject({ status: 0, stdout: `${pkg.version}\n` })
  })

  test('--help печатает справку со всеми вариантами', () => {
    const { status, stdout } = run('--help')
    expect(status).toBe(0)
    expect(stdout).toContain('Usage: create-nest-nuxt')
    expect(stdout).toContain(variantValues().join(', '))
  })
})

describe('ошибки аргументов — код 1, текст без стектрейса', () => {
  test('неизвестный вариант', () => {
    const { status, stderr } = run('my-app', '--variant', 'foo')
    expect(status).toBe(1)
    expect(stderr).toBe(`Unknown variant: foo\nExpected one of: ${variantValues().join(', ')}\n`)
  })

  test('неизвестный флаг', () => {
    const { status, stderr } = run('--foo')
    expect(status).toBe(1)
    expect(stderr).toContain('Unknown option \'--foo\'')
    expect(stderr).not.toContain('    at ')
  })
})
