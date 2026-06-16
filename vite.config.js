/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vitest solo corre tests de src/ — .claude/ trae suites de gstack (bun:test) que no son nuestras.
  test: {
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
