import Store from 'electron-store';
import { DEFAULT_SETTINGS, type AppSettings } from '../shared/types';

// JSON schema is enforced on every write; bad values get rejected with a descriptive error.
const schema = {
  anthropicApiKey: { type: 'string', default: '' },
  openaiApiKey: { type: 'string', default: '' },
  model: { type: 'string', default: DEFAULT_SETTINGS.model },
  systemPrompt: { type: 'string', default: DEFAULT_SETTINGS.systemPrompt },
  onboardingComplete: { type: 'boolean', default: false },
} as const;

// electron-store v8 supports CJS interop cleanly with Forge+Vite. Locked to v8 deliberately;
// v10+ is ESM-only and trips up the main process bundle unless you switch to dynamic import.
const store = new Store<AppSettings>({
  name: 'agent-electron-settings',
  schema: schema as never,
  defaults: DEFAULT_SETTINGS,
});

export function getSettings(): AppSettings {
  return {
    anthropicApiKey: store.get('anthropicApiKey'),
    openaiApiKey: store.get('openaiApiKey'),
    model: store.get('model'),
    systemPrompt: store.get('systemPrompt'),
    onboardingComplete: store.get('onboardingComplete'),
  };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    // keyof AppSettings is enforced by the caller's TS types; runtime values come from IPC.
    store.set(key as keyof AppSettings, value as never);
  }
  return getSettings();
}

/** Useful at startup — bridges electron-store into process.env so existing SDK code works. */
export function applySettingsToEnv(): void {
  const s = getSettings();
  if (s.anthropicApiKey) process.env.ANTHROPIC_API_KEY = s.anthropicApiKey;
  if (s.openaiApiKey) process.env.OPENAI_API_KEY = s.openaiApiKey;
}
