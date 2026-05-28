// Tailwind v4 reads configuration directly from your CSS via `@theme` directives
// (see src/renderer/index.css). This file is kept as a stub for spec compliance and
// for the rare migration case where you need a JS config object — Tailwind v4 still
// honors a config file if you opt in via `@config` in your CSS.
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
} satisfies Record<string, unknown>;
