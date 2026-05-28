import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS v4 is configured primarily in CSS via `@theme` blocks
 * inside `src/app/globals.css`. This file is kept as a minimal stub
 * for tools (e.g. IDE extensions) that still expect a JS config and to
 * make the `content` globs explicit. Most v4 setups can run without it.
 */
const config: Config = {
  content: [
    './src/**/*.{ts,tsx,mdx}',
    './src/app/**/*.{ts,tsx,mdx}',
    './src/components/**/*.{ts,tsx}',
  ],
};

export default config;
