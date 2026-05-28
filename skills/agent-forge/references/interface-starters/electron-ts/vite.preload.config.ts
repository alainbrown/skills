import { defineConfig } from 'vite';

// Vite config for the preload script. Output as CommonJS so contextBridge wiring
// is available at the earliest possible moment in the renderer process.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', /^node:.*/],
      output: {
        format: 'cjs',
        // main/index.ts loads `path.join(__dirname, 'preload.js')` — keep the name fixed.
        entryFileNames: 'preload.js',
      },
    },
  },
});
