import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin /api in dev so session cookies need no CORS handling.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  preview: {
    // Mirror the dev proxy so a production bundle (`vite preview`) can reach the API
    // during prod-build QA (e.g. verifying StrictMode-only artifacts are gone).
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: [...configDefaults.exclude, 'server/**'],
  },
})
