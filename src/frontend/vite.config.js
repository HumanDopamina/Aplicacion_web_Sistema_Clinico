import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    maxWorkers: 4,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
