import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

const serverProxy = {
  '/api': 'http://127.0.0.1:8787',
  '/s/': 'http://127.0.0.1:8787',
  '/uploads': 'http://127.0.0.1:8787',
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    modulePreload: false,
  },
  server: {
    // Keep local API, share pages, and published images on the frontend origin during dev QA.
    proxy: serverProxy,
  },
  preview: {
    // Mirror the dev proxy so production-bundle QA exercises the same public surface.
    proxy: serverProxy,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'server/**'],
  },
})
