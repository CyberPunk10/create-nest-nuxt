import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Собирает dist перед тестами, как бы их ни запустили — `pnpm test`,
    // `vitest` или из IDE. Иначе cli.test.ts проверял бы устаревшую сборку.
    globalSetup: './test/build.ts',
  },
})
