import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
  },
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test')
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src/renderer')
    }
  }
})
