import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure logic tests run in node; no jsdom needed since components are
    // tested as plain functions / data, not mounted.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    setupFiles: ['tests/unit/setup-chrome.ts'],
    // Restore spies to the throwing stubs (in setup-chrome) between tests so
    // an unmocked chrome.* call in one test can't leak into the next.
    restoreMocks: true,
  },
});
