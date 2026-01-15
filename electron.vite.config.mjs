import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Read version from package.json
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src/renderer')
      }
    }
  }
})

