// === BEGIN AGENT WIRING ===
// REPLACE: This file is replaced by the harness snippet during skill generation.
// See references/harness-snippets/<chosen-harness>.ts for the actual agent wiring.
// The skill copies that snippet into this location, preserving the imports below.
// === END AGENT WIRING ===

export async function* streamAgent(prompt: string): AsyncGenerator<AgentEvent> {
  // Placeholder — yields a fake response for the starter to be runnable on its own.
  yield { type: 'text', delta: 'Agent placeholder: replace src/agent.ts with a harness snippet.\n' };
  yield { type: 'text', delta: 'You typed: ' + prompt + '\n' };
}

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; id: string; name?: string; result: any; isError?: boolean }
  | { type: 'error'; error: string };
