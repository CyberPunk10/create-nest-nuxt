import { spawnSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import pkg from '../package.json' with { type: 'json' }
import { t } from '../src/i18n.ts'
import { variantValues } from '../src/variants.ts'
import { BIN, ROOT, run } from './cli.ts'

// CLI как чёрный ящик, но без скачивания: состав пакета, флаги, ошибки.
// Полный проход со скачиванием шаблона — в e2e.test.ts.

describe('пакет', () => {
  // Спрашиваем у самого npm, что уйдёт в публикацию, а не сверяем поля
  // package.json друг с другом. --ignore-scripts: сборка уже сделана, а
  // prepack запустил бы её ещё раз.
  const { stdout } = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  const [packed] = JSON.parse(stdout) as [{ files: { path: string }[] }]
  const files = packed.files.map(file => file.path)

  test('файл из bin попадает в npm', () => {
    expect(files).toContain(BIN)
  })

  test('исходники и тесты в npm не попадают', () => {
    expect(files.filter(path => path.startsWith('src/') || path.startsWith('test/'))).toEqual([])
  })
})

describe('флаги без вопросов', () => {
  test('--version печатает версию из package.json', () => {
    expect(run(['--version'])).toMatchObject({ status: 0, stdout: `${pkg.version}\n` })
  })

  test('--help печатает справку со всеми вариантами', () => {
    const { status, stdout } = run(['--help'])
    expect(status).toBe(0)
    expect(stdout).toContain('Usage: create-nest-nuxt')
    expect(stdout).toContain(variantValues().join(', '))
  })
})

describe('ошибки аргументов — код 1, текст без стектрейса', () => {
  test('неизвестный вариант', () => {
    const { status, stderr } = run(['my-app', '--variant', 'foo'])
    expect(status).toBe(1)
    expect(stderr).toBe(`Unknown variant: foo\nExpected one of: ${variantValues().join(', ')}\n`)
  })

  test('неизвестный флаг', () => {
    const { status, stderr } = run(['--foo'])
    expect(status).toBe(1)
    expect(stderr).toContain('Unknown option \'--foo\'')
    expect(stderr).not.toContain('    at ')
  })
})

describe('без терминала не зависает, а называет нужный флаг', () => {
  // Каждый случай — первый вопрос, на который нет ответа в аргументах.
  test.each([
    [[], 'en', '--lang en|ru|th'],
    [['--lang', 'ru'], 'ru', '<project-name>'],
    [['my-app', '--lang', 'ru'], 'ru', `--variant ${variantValues().join('|')}`],
  ])('%j', (args, locale, flag) => {
    const { status, stderr } = run(args)
    expect(status).toBe(1)
    expect(stderr).toBe(`${t(locale).needsFlag(flag)}\n`)
  })
})
