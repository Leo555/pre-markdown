import { defineConfig } from 'vitest/config'
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
      // Benchmark libs (from benchmark/node_modules)
      'marked': resolve(benchNodeModules, 'marked'),
      'markdown-it': resolve(benchNodeModules, 'markdown-it'),
      'commonmark': resolve(benchNodeModules, 'commonmark'),
      'showdown': resolve(benchNodeModules, 'showdown'),
      'remarkable': resolve(benchNodeModules, 'remarkable'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    globals: true,
    include: [
      'packages/**/__tests__/**/*.test.ts',
      'harness/**/*.test.ts',
    ],
    benchmark: {
      include: [
        'harness/benchmarks/**/*.bench.ts',
      ],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.d.ts', '**/__tests__/**', '**/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
})
