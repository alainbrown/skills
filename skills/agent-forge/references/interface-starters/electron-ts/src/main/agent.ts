// === BEGIN AGENT WIRING ===
// REPLACE: This file is replaced by the harness snippet during skill generation.
// See references/harness-snippets/<chosen-harness>.ts for the actual agent wiring.
// === END AGENT WIRING ===

import type { AgentEvent } from '../shared/types';

/**
 * Placeholder agent. Streams two text deltas back to the renderer so the UI lights up.
 * Replace this generator with a real harness call (Anthropic Agent SDK, OpenAI Agents,
 * Vercel AI SDK, a subprocess wrapping a Python harness, etc.) — the rest of the app
 * only depends on the AsyncGenerator<AgentEvent> contract.
 */
export async function* streamAgent(prompt: string): AsyncGenerator<AgentEvent> {
  yield { type: 'text', delta: 'Placeholder agent. Replace src/main/agent.ts.\n' };
  yield { type: 'text', delta: 'You typed: ' + prompt };
}
