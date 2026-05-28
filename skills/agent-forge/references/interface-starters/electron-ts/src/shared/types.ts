// Types shared between the main process (Node) and the renderer (browser).
// Keep this file free of imports from `electron` so the renderer can include it safely.

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name?: string; result: unknown; isError?: boolean }
  | { type: 'error'; error: string };

export type StreamHandle = {
  /** Unique id for this streaming turn — used to scope `agent:stream-event` traffic. */
  streamId: string;
};

export interface AppSettings {
  anthropicApiKey: string;
  openaiApiKey: string;
  model: string;
  systemPrompt: string;
  /** Increment when the user finishes the first-launch settings flow. */
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  anthropicApiKey: '',
  openaiApiKey: '',
  model: 'claude-sonnet-4-5',
  systemPrompt: 'You are a helpful AI assistant.',
  onboardingComplete: false,
};

/** Channel names — exported so main + preload + renderer can't drift. */
export const IPC = {
  AgentStream: 'agent:stream',
  AgentStreamEvent: 'agent:stream-event',
  AgentStreamDone: 'agent:stream-done',
  AgentStreamError: 'agent:stream-error',
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  ShellOpenPath: 'shell:open-path',
} as const;
