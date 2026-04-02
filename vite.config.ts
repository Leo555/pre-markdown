import { defineConfig } from 'vite'
import { resolve } from 'path'

const benchNodeModules = resolve(__dirname, 'benchmark/node_modules')

export default defineConfig({
  resolve: {
    alias: {
      '@pre-markdown/core': resolve(__dirname, 'packages/core/src'),
      '@pre-markdown/parser': resolve(__dirname, 'packages/parser/src'),
      '@pre-markdown/layout': resolve(__dirname, 'packages/layout/src'),
      '@pre-markdown/renderer': resolve(__dirname, 'packages/renderer/src'),
      '@pre-markdown/editor': resolve(__dirname, 'packages/editor/src'),
      // Benchmark-only libs → resolved from benchmark/node_modules
      'marked': resolve(benchNodeModules, 'marked'),
      'markdown-it': resolve(benchNodeModules, 'markdown-it'),
      'commonmark': resolve(benchNodeModules, 'commonmark'),
      'showdown': resolve(benchNodeModules, 'showdown'),
      'remarkable': resolve(benchNodeModules, 'remarkable'),
      'cherry-markdown/engine': resolve(benchNodeModules, 'cherry-markdown/dist/cherry-markdown.engine.core.esm.js'),
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: ['.'],
    },
  },
  optimizeDeps: {
    exclude: ['@chenglou/pretext'],
    entries: ['index.html', 'demo/main.ts', 'benchmark/index.html', 'benchmark/main.ts', 'benchmark/compat.html', 'benchmark/compat.ts'],
  },
})
