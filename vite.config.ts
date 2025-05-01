import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/TextStore.ts'),
      name: 'TextStore',
      fileName: 'textstore',
      formats: ['es']
    },
    rollupOptions: {
      external: ['n3', 'flexsearch', '@rdfjs/data-model', '@rdfjs/namespace']
    }
  }
})
