// FORGE: typed message contract between UI surfaces and the service worker.
// Add new message variants here, then handle them in service-worker.ts.

export type Message =
  | { type: 'ping' }
  | { type: 'do-work' };

export type Response<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
