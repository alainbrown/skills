import { vi } from 'vitest';

// Chrome's unit-testing guidance recommends stubbing only the chrome.* surface
// the code under test touches, with stubs that THROW by default so any call a
// test forgot to mock fails loudly instead of silently returning undefined.
// Override per-test with `vi.spyOn(chrome.storage.sync, 'get').mockResolvedValue(...)`.
// vitest.config.ts has restoreMocks: true so overrides reset between tests.
// https://developer.chrome.com/docs/extensions/how-to/test/unit-testing
const unmocked =
  (name: string) =>
  (): never => {
    throw new Error(`chrome.${name} called without a mock`);
  };

// FORGE: add the chrome.* namespaces your code touches here.
vi.stubGlobal('chrome', {
  storage: {
    sync: {
      get: unmocked('storage.sync.get'),
      set: unmocked('storage.sync.set'),
    },
    local: {
      get: unmocked('storage.local.get'),
      set: unmocked('storage.local.set'),
      remove: unmocked('storage.local.remove'),
    },
    onChanged: {
      addListener: unmocked('storage.onChanged.addListener'),
      removeListener: unmocked('storage.onChanged.removeListener'),
    },
  },
  runtime: {
    sendMessage: unmocked('runtime.sendMessage'),
    openOptionsPage: unmocked('runtime.openOptionsPage'),
  },
});
