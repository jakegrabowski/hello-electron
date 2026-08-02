import { defineConfig } from 'vite';

// The renderer source lives under src/renderer (index.html + renderer.ts).
// Vite resolves `root` relative to the project directory.
export default defineConfig({
  root: 'src/renderer',
});
