import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { UserError } from '../src/errors.ts'
import { t } from '../src/i18n.ts'
import { emptyDir, isEmptyDir } from '../src/target-dir.ts'

const messages = t('en')
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cnn-target-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('isEmptyDir', () => {
  test('несуществующая папка — пустая', async () => {
    expect(await isEmptyDir(join(dir, 'missing'), messages)).toBe(true)
  })

  test('папка без файлов — пустая', async () => {
    expect(await isEmptyDir(dir, messages)).toBe(true)
  })

  test('папка только с .git — пустая: свежий клон пустого репозитория', async () => {
    await mkdir(join(dir, '.git'))
    expect(await isEmptyDir(dir, messages)).toBe(true)
  })

  test('любой другой файл — уже не пустая', async () => {
    await mkdir(join(dir, '.git'))
    await writeFile(join(dir, 'notes.txt'), '')
    expect(await isEmptyDir(dir, messages)).toBe(false)
  })

  test('файл вместо папки — понятная ошибка, а не ENOTDIR', async () => {
    const file = join(dir, 'file')
    await writeFile(file, '')
    await expect(isEmptyDir(file, messages)).rejects.toThrow(
      new UserError(messages.notADirectory(file)),
    )
  })
})

describe('emptyDir', () => {
  test('удаляет всё, кроме .git, включая вложенные папки', async () => {
    await mkdir(join(dir, '.git'))
    await writeFile(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n')
    await mkdir(join(dir, 'src', 'deep'), { recursive: true })
    await writeFile(join(dir, 'src', 'deep', 'a.ts'), '')
    await writeFile(join(dir, '.env'), '')

    await emptyDir(dir)

    expect(await readdir(dir)).toEqual(['.git'])
    expect(await readdir(join(dir, '.git'))).toEqual(['HEAD'])
  })

  test('несуществующая папка — не ошибка', async () => {
    await expect(emptyDir(join(dir, 'missing'))).resolves.toBeUndefined()
  })
})
