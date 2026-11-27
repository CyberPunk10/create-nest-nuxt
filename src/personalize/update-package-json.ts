import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import pkg from '../../package.json' with { type: 'json' }
import type { Locale } from '../i18n.ts'

/**
 * Поля, которые описывают шаблон, а не проект пользователя. license
 * удаляется намеренно: MIT здесь принадлежит автору шаблона, и наследовать
 * его в чужом проекте неуместно.
 */
const TEMPLATE_FIELDS = ['author', 'license', 'keywords', 'description']

/**
 * Выставляет имя и версию `0.0.0` в корневом package.json, убирает из него
 * поля, описывающие шаблон, и дописывает в паспорт проекта (`templateOrigin`)
 * как и когда он создан.
 * @param today Дата создания; параметр — для тестов.
 */
export async function updatePackageJson(
  dir: string,
  projectName: string,
  locale: Locale,
  today: Date = new Date(),
): Promise<void> {
  const path = join(dir, 'package.json')
  const raw = await readFile(path, 'utf8')
  const project = JSON.parse(raw) as Record<string, unknown>

  project.name = projectName
  project.version = '0.0.0'

  for (const field of TEMPLATE_FIELDS) delete project[field]

  // Вариант, репозиторий и базовую версию шаблон пишет сам; генератор
  // добавляет то, что знает только он. По createdWith документация отличает
  // проект из генератора от копии ветки шаблона.
  const origin = project.templateOrigin
  if (!origin || typeof origin !== 'object') {
    throw new Error('Template mismatch: package.json has no templateOrigin')
  }
  project.templateOrigin = {
    ...origin,
    createdWith: `${pkg.name}@${pkg.version}`,
    createdAt: localDate(today),
    docsLanguage: locale,
  }

  // Отступ берём из исходника, чтобы не переформатировать файл целиком:
  // diff первого коммита пользователя должен быть про его проект. Строкой,
  // а не числом: так сохраняются и пробелы, и табы.
  const indent = raw.match(/\n([ \t]+)"/)?.[1] ?? 2

  await writeFile(path, JSON.stringify(project, null, indent) + '\n')
}

/** ГГГГ-ММ-ДД по местному времени: какой день был у человека, когда он создал проект. */
function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
