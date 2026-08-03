import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls: false } })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: [...configDefaults.exclude, '.tmp/**', 'tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'test-results/coverage',
      include: [
        'src/core/diagnostics.ts',
        'src/core/i18n.ts',
        'src/platforms/live/adapters.ts',
        'src/platforms/live/descriptor.ts',
        'src/platforms/live/selector-adapter.ts',
        'src/platforms/huya/adapter.ts',
        'src/platforms/bilibili/adapter.ts',
        'src/platforms/douyu/adapter.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
      },
    },
  },
})
