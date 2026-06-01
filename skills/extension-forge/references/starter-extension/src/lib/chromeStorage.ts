import type { Settings } from './types';

// FORGE: the chrome.storage wiring lives here (NOT in components). Containers
// call these; the service worker calls these. Pure components never do.

// FORGE: set sensible defaults for every Settings field.
export const SETTINGS_DEFAULTS: Settings = {
  enabled: true,
  label: '',
};

const SETTINGS_KEY = 'settings';

export async function getSettings(): Promise<Settings> {
  const raw = await chrome.storage.sync.get(SETTINGS_KEY);
  const stored = (raw[SETTINGS_KEY] ?? {}) as Partial<Settings>;
  return { ...SETTINGS_DEFAULTS, ...stored };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await chrome.storage.sync.set({ [SETTINGS_KEY]: next });
  return next;
}
