import { defineConfig } from '@playwright/test';

// Extensions load via a persistent context (see tests/e2e/fixtures.ts), which
// must run single-worker — multiple persistent contexts collide.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    actionTimeout: 10_000,
  },
});
