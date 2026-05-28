import { defineConfig } from 'vite';

// Vite config for the Electron MAIN process (Node target).
// Forge's plugin injects `MAIN_WINDOW_VITE_DEV_SERVER_URL` & `MAIN_WINDOW_VITE_NAME` for us.
// `package.json` declares main as `.vite/build/main.js`, so the bundle MUST be named main.js.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', /^node:.*/],
      output: {
        entryFileNames: 'main.js',
      },
    },
  },
});
