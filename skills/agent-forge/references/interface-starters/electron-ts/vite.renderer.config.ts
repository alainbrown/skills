import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite config for the renderer (browser context).
// Forge passes project root + outDir for us; index.html lives at the project root
// (canonical Forge layout). The renderer entry is loaded via `/src/renderer/main.tsx`
// from inside index.html.
//
// Tailwind v4 uses the dedicated Vite plugin — no postcss.config or tailwind.config needed.
// (Stub `tailwind.config.ts` and `postcss.config.mjs` exist alongside as documentation.)
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
