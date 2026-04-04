import { defineConfig } from 'vite'
import { resolve } from 'path'
import { cpSync, existsSync } from 'fs'

const benchNodeModules = resolve(__dirname, 'benchmark/node_modules')

/** Copy benchmark fixtures to build output so fetch('./fixtures/...') works on GitHub Pages */
function copyBenchmarkFixtures() {
  return {
    name: 'copy-benchmark-fixtures',
    closeBundle() {
      const src = resolve(__dirname, 'benchmark/fixtures')
      const dest = resolve(__dirname, '_site/benchmark/fixtures')
      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true })
        console.log('✓ Copied benchmark/fixtures → _site/benchmark/fixtures')
      }
    },
  }
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pre-markdown/' : '/',
  plugins: [copyBenchmarkFixtures()],
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
    },
  },
  server: {
    port: 9527,
    open: true,
    fs: {
      allow: ['.'],
    },
  },
  build: {
    outDir: '_site',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        standalone: resolve(__dirname, 'standalone.html'),
        benchmark: resolve(__dirname, 'benchmark/index.html'),
        benchmarkCompat: resolve(__dirname, 'benchmark/compat.html'),
        exBasic: resolve(__dirname, 'examples/basic.html'),
        exAstTransform: resolve(__dirname, 'examples/ast-transform.html'),
        exCustomRenderer: resolve(__dirname, 'examples/custom-renderer.html'),
        exIncremental: resolve(__dirname, 'examples/incremental-parsing.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@chenglou/pretext'],
    entries: ['index.html', 'demo/main.ts', 'benchmark/index.html', 'benchmark/main.ts', 'benchmark/compat.html', 'benchmark/compat.ts', 'benchmark/compat-inline.ts'],
  },
}))
