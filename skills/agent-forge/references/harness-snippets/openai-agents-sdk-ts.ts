// === BEGIN AGENT WIRING (openai-agents-sdk / TypeScript) ===
// Harness: @openai/agents (>=0.11.5)
// Profile: references/harness-profiles/openai-agents-sdk.md
//
// This snippet replaces src/agent.ts in the starter. It exposes:
//   - streamAgent(prompt, history?) — AsyncGenerator<AgentEvent>
//   - AgentEvent (re-exported)
//
// Customization points are marked `// SKILL:`.
// Items requiring runtime verification against the installed SDK version are
// marked `// TODO: verify`.
// === END AGENT WIRING ===

import {
  Agent,
  MCPServerStdio,
  run,
  tool,
  isOpenAIResponsesRawModelStreamEvent,
} from '@openai/agents';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// AgentEvent — the starter's wire-format. Must match src/agent.ts contract.
// ---------------------------------------------------------------------------
export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; id: string; result: any; isError?: boolean }
  | { type: 'error'; error: string };

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
// SKILL: replace this string from state.agent.systemPrompt.
const SYSTEM_PROMPT = `You are a helpful assistant.`;

// ---------------------------------------------------------------------------
// MCP servers
// ---------------------------------------------------------------------------
// SKILL: append one MCPServerStdio per entry in state.tools.mcpServers.
// Each entry maps to:
//   new MCPServerStdio({
//     name: '<state.tools.mcpServers[i].name>',
//     fullCommand: 'npx -y <state.tools.mcpServers[i].package> <args...>',
//   })
//
// TODO: verify — the TS MCP surface stabilised at MCPServerStdio /
// MCPServerSse / MCPServerStreamableHttp on @openai/agents 0.11.5, attached
// via the `mcpServers: [...]` field on the Agent constructor. Earlier docs
// referenced a `connectMcpServers(agent, [...])` helper that no longer exists
// in 0.11.x. If the install version differs, re-check guides/mcp.
const MCP_SERVERS: MCPServerStdio[] = [
  // SKILL: example, remove if no MCP servers selected.
  // new MCPServerStdio({
  //   name: 'filesystem',
  //   fullCommand: 'npx -y @modelcontextprotocol/server-filesystem ./',
  // }),
];

// ---------------------------------------------------------------------------
// Custom function tools
// ---------------------------------------------------------------------------
// SKILL: append one `tool({...})` per entry in state.tools.custom.
// Pattern: zod schema for parameters, async execute returning the tool result.
const TOOLS = [
  // SKILL: example, remove if no custom tools selected.
  // tool({
  //   name: 'get_weather',
  //   description: 'Get the weather for a city.',
  //   parameters: z.object({ city: z.string() }),
  //   execute: async ({ city }) => `Sunny in ${city}.`,
  // }),
];

// ---------------------------------------------------------------------------
// Retry / error policy
// ---------------------------------------------------------------------------
// SKILL: configure attempts + baseDelayMs from state.ux.errorPolicy.
//   llm_failure: 'fail-fast' -> attempts = 1
//   llm_failure: 'retry'     -> attempts = 3 (default below)
//   rate_limit:  'wait-retry'-> respect retry-after if surfaced
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

async function _withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === RETRY_ATTEMPTS) break;
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// streamAgent — primary contract consumed by the starter.
// ---------------------------------------------------------------------------
// `history` is reserved for future multi-turn wiring. The Agents SDK exposes
// conversation state via RunState / sessions; the starter currently passes a
// single prompt per turn so we accept-and-ignore it for now.
export async function* streamAgent(
  prompt: string,
  history?: any[], // eslint-disable-line @typescript-eslint/no-unused-vars
): AsyncGenerator<AgentEvent> {
  // Connect any configured MCP servers. Lifecycle is the caller's
  // responsibility per the SDK docs, so we open here and close in `finally`.
  const connectedServers: MCPServerStdio[] = [];
  try {
    for (const server of MCP_SERVERS) {
      await server.connect();
      connectedServers.push(server);
    }

    const agent = new Agent({
      name: 'Assistant', // SKILL: replace from state.agent.name
      instructions: SYSTEM_PROMPT,
      tools: TOOLS,
      mcpServers: MCP_SERVERS,
    });

    // run() with stream:true returns a StreamedRunResult that is itself an
    // async-iterable of RunStreamEvent. See guides/streaming.
    const result = await _withRetry(() =>
      run(agent, prompt, { stream: true }),
    );

    for await (const event of result) {
      // -- text deltas (OpenAI Responses raw events) --
      // TODO: verify — the helper guard isOpenAIResponsesRawModelStreamEvent
      // is exported from @openai/agents in 0.11.5. If you swap providers
      // (e.g. Chat Completions), use isOpenAIChatCompletionsRawModelStreamEvent
      // and read event.data.choices[0].delta.content instead.
      if (
        event.type === 'raw_model_stream_event' &&
        isOpenAIResponsesRawModelStreamEvent(event) &&
        (event as any).data?.event?.type === 'response.output_text.delta'
      ) {
        const delta = (event as any).data.event.delta;
        if (typeof delta === 'string' && delta.length > 0) {
          yield { type: 'text', delta };
        }
        continue;
      }

      // -- fully-formed run items (tool calls, tool outputs, messages) --
      if (event.type === 'run_item_stream_event') {
        const item: any = (event as any).item;
        const name: string = (event as any).name;

        // Tool was called by the model
        if (name === 'tool_called') {
          const raw = item?.rawItem ?? {};
          const callId: string = raw.callId ?? raw.id ?? '';
          const toolName: string = raw.name ?? 'unknown_tool';
          let input: any = raw.arguments ?? {};
          if (typeof input === 'string') {
            try {
              input = JSON.parse(input);
            } catch {
              /* keep as string if not valid JSON */
            }
          }
          yield { type: 'tool_use', id: callId, name: toolName, input };
          continue;
        }

        // Tool returned a result
        if (name === 'tool_output') {
          const raw = item?.rawItem ?? {};
          const callId: string = raw.callId ?? raw.id ?? '';
          const output = raw.output ?? item?.output;
          const isError =
            raw.status === 'incomplete' || item?.isError === true;
          yield {
            type: 'tool_result',
            id: callId,
            result: output,
            isError,
          };
          continue;
        }

        // message_output_created and handoff_* are surfaced as text deltas
        // already (via raw events); we ignore them here to avoid duplication.
        continue;
      }

      // agent_updated_stream_event (handoffs) — no-op for the wire format.
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    yield { type: 'error', error: message };
  } finally {
    // Close any MCP servers we connected, swallowing close errors so they
    // don't mask a primary failure.
    for (const server of connectedServers) {
      try {
        await server.close();
      } catch {
        /* ignore */
      }
    }
  }
}
