// Mock props fed to the demo compositions. The starter renders standalone
// with these. When you wire in the extension's real components via the
// `@ext` alias, shape these objects to match those components' prop types
// (import the types: `import type { Settings } from "@ext/lib/types"`).
//
// FORGE: replace with realistic fixtures for your extension. Numbers that
// look plausible (not round, not zero) make the demo read as real product.

export interface MockItem {
  id: string;
  title: string;
  subtitle: string;
  /** 0..1 — drives a progress bar / meter in placeholder UI. */
  value: number;
}

// FORGE: the extension's primary list/collection (history entries, tabs,
// saved items, sessions, rules — whatever the popup shows).
export const MOCK_ITEMS: MockItem[] = [
  { id: "i-1", title: "example.com", subtitle: "last seen 3d ago", value: 0.82 },
  { id: "i-2", title: "news.ycombinator.com", subtitle: "last seen 1d ago", value: 0.64 },
  { id: "i-3", title: "github.com", subtitle: "active today", value: 0.21 },
  { id: "i-4", title: "docs.google.com", subtitle: "last seen 6d ago", value: 0.93 },
  { id: "i-5", title: "figma.com", subtitle: "last seen 12h ago", value: 0.4 },
];

// FORGE: the headline stat the popup leads with.
export const MOCK_STATS = {
  primaryCount: 1247,
  primaryLabel: "items pending",
  secondaryCount: 874,
  secondaryLabel: "cleaned last run",
  lastRunAgo: "3d ago",
};

// FORGE: a settings/config object. When reusing a live Settings component,
// replace this with that component's real prop shape.
export const MOCK_SETTINGS = {
  enabled: true,
  thresholdLabel: "2 months",
  frequencyLabel: "every 6 hours",
  categories: {
    history: true,
    cookies: true,
    cache: false,
    downloads: true,
  },
};

// FORGE: marketing copy reused across store assets. One source of truth so
// the marquee, tile, thumbnail and captions stay consistent.
export const COPY = {
  name: "My Extension", // FORGE: product name
  eyebrow: "Chrome Extension",
  tagline: "One line that says what it does.", // FORGE
  blurb:
    "A slightly longer sentence describing the core benefit, who it is for, and why it is worth installing.", // FORGE
};
