/**
 * Сообщения CLI на всех языках. Язык спрашивается первым вопросом, дальше
 * пользователь читает на выбранном.
 * @module
 */

/** Языки для первого вопроса; каждое название написано на своём языке. */
export const locales = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'th', label: 'ไทย' },
] as const

/** Код языка CLI. */
export type Locale = (typeof locales)[number]['value']

/**
 * Английский — эталон: по нему выводится тип {@link Messages}, и остальные
 * языки обязаны иметь те же ключи с теми же типами.
 */
const en = {
  projectName: 'Project name',
  noSpaces: 'No spaces — use a hyphen',
  packageName: 'Package name',
  invalidPackageName: 'Invalid package.json name',
  packageNameRequired: 'Enter a package name',
  variant: 'Which variant?',
  notEmpty: (dir: string) => `${dir} is not empty. What should we do?`,
  overwriteCancel: 'Cancel',
  overwriteRemove: 'Remove existing files and continue',
  overwriteKeep: 'Keep existing files and continue',
  downloading: 'Downloading template',
  downloadFailed: 'Download failed',
  ready: 'Template ready',
  nextSteps: 'Next steps',
  cancelled: 'Cancelled',
  done: 'Done',
  unknownVariant: (value: string) => `Unknown variant: ${value}`,
  expectedOneOf: (list: string) => `Expected one of: ${list}`,
  unexpectedArgument: (value: string) => `Unexpected argument: ${value}`,
  oneProjectName: 'Only one project name is allowed, without spaces',
  variantHints: {
    'main': 'Base. No authentication, no database',
    'auth-session': 'Base + authentication. No database',
    'postgres-prisma': 'Base + authentication + database',
  },
}

/** Набор сообщений одного языка. */
export type Messages = typeof en

const dict: Record<Locale, Messages> = {
  en,

  ru: {
    projectName: 'Название проекта',
    noSpaces: 'Без пробелов — используйте дефис',
    packageName: 'Имя пакета',
    invalidPackageName: 'Недопустимое имя для package.json',
    packageNameRequired: 'Введите имя пакета',
    variant: 'Какой вариант?',
    notEmpty: dir => `Папка ${dir} не пуста. Что сделать?`,
    overwriteCancel: 'Отменить',
    overwriteRemove: 'Удалить файлы и продолжить',
    overwriteKeep: 'Оставить файлы и продолжить',
    downloading: 'Скачиваю шаблон',
    downloadFailed: 'Не удалось скачать',
    ready: 'Шаблон готов',
    nextSteps: 'Дальше',
    cancelled: 'Отменено',
    done: 'Готово',
    unknownVariant: value => `Неизвестный вариант: ${value}`,
    expectedOneOf: list => `Ожидается один из: ${list}`,
    unexpectedArgument: value => `Лишний аргумент: ${value}`,
    oneProjectName: 'Название проекта — одно и без пробелов',
    variantHints: {
      'main': 'Базовый вариант. Авторизация не реализована, БД отсутвует',
      'auth-session': 'Базовый вариант + Авторизация. БД отсутствует',
      'postgres-prisma': 'Базовый вариант + Авторизация + БД',
    },
  },

  th: {
    projectName: 'ชื่อโปรเจกต์',
    noSpaces: 'ห้ามมีช่องว่าง ใช้ขีดกลาง (-) แทน',
    packageName: 'ชื่อแพ็กเกจ',
    invalidPackageName: 'ชื่อไม่ถูกต้องสำหรับ package.json',
    packageNameRequired: 'กรุณาใส่ชื่อแพ็กเกจ',
    variant: 'เลือกตัวเลือกไหน?',
    notEmpty: dir => `โฟลเดอร์ ${dir} ไม่ว่าง จะทำอย่างไร?`,
    overwriteCancel: 'ยกเลิก',
    overwriteRemove: 'ลบไฟล์เดิมแล้วดำเนินการต่อ',
    overwriteKeep: 'เก็บไฟล์เดิมไว้แล้วดำเนินการต่อ',
    downloading: 'กำลังดาวน์โหลดเทมเพลต',
    downloadFailed: 'ดาวน์โหลดไม่สำเร็จ',
    ready: 'เทมเพลตพร้อมแล้ว',
    nextSteps: 'ขั้นตอนต่อไป',
    cancelled: 'ยกเลิกแล้ว',
    done: 'เสร็จสิ้น',
    unknownVariant: value => `ไม่รู้จักตัวเลือก: ${value}`,
    expectedOneOf: list => `ต้องเป็นหนึ่งใน: ${list}`,
    unexpectedArgument: value => `อาร์กิวเมนต์เกิน: ${value}`,
    oneProjectName: 'ระบุชื่อโปรเจกต์ได้ชื่อเดียว และห้ามมีช่องว่าง',
    variantHints: {
      'main': 'พื้นฐาน ยังไม่มีระบบยืนยันตัวตนและฐานข้อมูล',
      'auth-session': 'พื้นฐาน + ระบบยืนยันตัวตน ยังไม่มีฐานข้อมูล',
      'postgres-prisma': 'พื้นฐาน + ระบบยืนยันตัวตน + ฐานข้อมูล',
    },
  },
}

/** Словарь выбранного языка; для неизвестного — английский. */
export function t(locale: string): Messages {
  return dict[locale as Locale] ?? dict.en
}
