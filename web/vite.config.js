import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    global: 'window',
  },
  resolve: {
    alias: {
      'monaco-editor/esm/vs/editor/editor.api.js': path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/editor.api.js'),
      'monaco-editor/esm/vs/editor/editor.api': path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/editor.api.js'),
      'monaco-editor': path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/editor.api.js'),
    },
  },
  base: '/',
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})