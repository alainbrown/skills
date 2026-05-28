// === BEGIN AGENT WIRING ===
// REPLACE: This file is replaced by the harness snippet during skill generation.
// See references/harness-snippets/<chosen-harness>.ts for the actual agent wiring.
// === END AGENT WIRING ===

/**
 * Canonical event shape every harness must emit. The API route and UI both
 * speak this protocol; swapping the agent only requires producing the same
 * events. Keep this union stable — downstream snippets depend on it.
 */
export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; result: unknown; isError?: boolean }
  | { type: 'error'; error: string };

/**
 * A single turn in the conversation history. Kept intentionally loose so the
 * placeholder works with whatever shape the swapped-in harness wants.
 */
export type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Stream events for one user turn. The placeholder simply echoes the prompt
 * back, with a small delay between deltas so you can verify streaming works
 * end-to-end in the browser before plugging in a real model.
 */
export async function* streamAgent(
  prompt: string,
  history: HistoryMessage[],
): AsyncGenerator<AgentEvent> {
  const banner = 'Placeholder agent. Replace src/agent.ts.\n\n';
  for (const ch of banner) {
    yield { type: 'text', delta: ch };
    await sleep(8);
  }

  const summary =
    history.length > 0
      ? `Conversation so far: ${history.length} prior message${
          history.length === 1 ? '' : 's'
        }.\n\n`
      : '';
  for (const ch of summary) {
    yield { type: 'text', delta: ch };
    await sleep(4);
  }

  const echo = `You typed: ${prompt}`;
  for (const ch of echo) {
    yield { type: 'text', delta: ch };
    await sleep(6);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
