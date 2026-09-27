import { defineConfig } from 'tsdown'

// Собирает src/*.ts в один файл dist/index.mjs — его и публикуем в npm.
//
// Зачем собирать, если в разработке Node запускает .ts сам: у пользователя
// npx кладёт пакет в node_modules, а файлы .ts оттуда Node запускать
// отказывается. Поэтому в npm уходит готовый JavaScript.
//
// @clack/prompts и giget внутрь dist/index.mjs не вшиваются: они указаны в
// dependencies, и npm установит их рядом с пакетом сам.
export default defineConfig({
  entry: 'src/index.ts',
  platform: 'node',
  target: 'node22',
})
