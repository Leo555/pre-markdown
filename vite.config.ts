import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@pre-markdown/core': resolve(__dirname, 'packages/core/src'),
      '@pre-markdown/parser': resolve(__dirname, 'packages/parser/src'),
      '@pre-markdown/layout': resolve(__dirname, 'packages/layout/src'),
      '@pre-markdown/renderer': resolve(__dirname, 'packages/renderer/src'),
      '@pre-markdown/editor': resolve(__dirname, 'packages/editor/src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      // Only allow serving files from root (excludes cherry-markdown implicitly)
      allow: ['.'],
    },
  },
  optimizeDeps: {
    // Don't scan cherry-markdown directory
    exclude: ['@chenglou/pretext'],
    entries: ['index.html', 'demo/main.ts'],
  },
})
