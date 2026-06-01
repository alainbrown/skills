// Shared design tokens for the demo + store assets. Keep this small and
// JSON-serializable-friendly so brand swaps are a one-liner.
//
// FORGE: tune these to the extension's real brand. `brand` is also passed
// as a prop into every composition (see Root.tsx) so it can be overridden
// per-render without editing code.

export const DEFAULT_BRAND = "#5258d8";

export const FONT = {
  // System stack so the starter renders with no font downloads. Swap for
  // @remotion/google-fonts (see catm/demo theme.ts) if you want a webfont.
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
} as const;

/** Lighten/darken helper for deriving accent gradient stops from `brand`. */
export function shade(hex: string, amount: number): string {
  const n = hex.replace("#", "");
  const num = parseInt(n.length === 3 ? n.replace(/(.)/g, "$1$1") : n, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + amount));
  const b = Math.min(255, Math.max(0, (num & 255) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const INK = {
  0: "#0d0e12",
  1: "#2a2d35",
  2: "#585d6b",
  3: "#8c92a3",
} as const;

export const SHADOW = {
  panel:
    "0 1px 2px rgba(13,14,18,0.04), 0 24px 60px rgba(13,14,18,0.16)",
} as const;
