// Inert `chrome.*` no-ops for the Remotion render environment.
//
// The demo reuses the extension's LIVE React components (via the `@ext`
// alias). Those components are meant to be PURE — props in, JSX out — but
// sometimes one transitively imports a module that touches `chrome.*` at
// import time (a constants file that reads `chrome.runtime.getURL`, a hook
// that calls `chrome.storage`, etc). Inside Remotion's headless Chromium
// there is no extension context, so `chrome` is undefined and the bundle
// throws on load.
//
// Importing this file once (it self-installs on import) provides a minimal,
// side-effect-free `chrome` global so those imports resolve. It does NOT
// make the APIs functional — calls return empty/default values. Feed real
// state through props + mockData instead.
//
// Usage: add `import "./chrome-shim";` at the TOP of Demo.tsx / any store
// composition that imports `@ext` components (before the @ext imports).
//
// FORGE: extend the stubbed surface to cover whatever `chrome.*` your
// reused components reach for. Add only what actually gets called at
// import/render time — keep it minimal.

const noop = () => undefined;

const asyncNoop = (...args: unknown[]) => {
  const cb = args[args.length - 1];
  if (typeof cb === "function") (cb as (...a: unknown[]) => void)();
  return Promise.resolve(undefined);
};

const listener = { addListener: noop, removeListener: noop, hasListener: () => false };

const shim = {
  runtime: {
    id: "demo-shim",
    getURL: (p: string) => p,
    sendMessage: asyncNoop,
    connect: () => ({ postMessage: noop, onMessage: listener, onDisconnect: listener }),
    onMessage: listener,
    onInstalled: listener,
    getManifest: () => ({ version: "0.0.0", name: "demo" }),
    lastError: undefined,
  },
  storage: {
    local: { get: asyncNoop, set: asyncNoop, remove: asyncNoop, clear: asyncNoop, onChanged: listener },
    sync: { get: asyncNoop, set: asyncNoop, remove: asyncNoop, clear: asyncNoop, onChanged: listener },
    session: { get: asyncNoop, set: asyncNoop, remove: asyncNoop, clear: asyncNoop },
    onChanged: listener,
  },
  tabs: { query: asyncNoop, create: asyncNoop, update: asyncNoop, sendMessage: asyncNoop },
  action: { setBadgeText: asyncNoop, setBadgeBackgroundColor: asyncNoop, setIcon: asyncNoop },
  i18n: { getMessage: (k: string) => k, getUILanguage: () => "en-US" },
  permissions: { contains: asyncNoop, request: asyncNoop },
  alarms: { create: noop, clear: asyncNoop, onAlarm: listener },
  contextMenus: { create: noop, remove: noop, removeAll: noop, onClicked: listener },
};

declare global {
  // eslint-disable-next-line no-var
  var chrome: typeof shim & Record<string, unknown>;
}

if (typeof globalThis !== "undefined" && !(globalThis as Record<string, unknown>).chrome) {
  (globalThis as Record<string, unknown>).chrome = shim;
}

export {};
