import { defineConfig } from 'tsup'

export default defineConfig([
  // Main bundle (ESM + CJS + DTS)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    outDir: 'dist',
    tsconfig: 'tsconfig.build.json',
    external: ['@pre-markdown/core', '@chenglou/pretext'],
  },
  // Worker script (ESM only, self-contained)
  {
    entry: ['src/worker-script.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    outDir: 'dist',
    tsconfig: 'tsconfig.build.json',
    // Worker script bundles pretext inline (no external)
    noExternal: ['@chenglou/pretext'],
  },
])
