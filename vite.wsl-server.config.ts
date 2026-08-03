import { defineConfig } from 'vite';

// Builds the WSL helper server as a standalone Node (CommonJS) bundle, separate
// from the Electron app. Output: dist/wsl-server/index.js (run with `node`).
export default defineConfig({
  build: {
    lib: {
      entry: 'src/wsl-server/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    outDir: 'dist/wsl-server',
    target: 'node18',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      external: [/^node:/],
    },
  },
});
