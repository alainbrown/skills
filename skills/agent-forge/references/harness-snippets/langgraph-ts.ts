// === BEGIN AGENT WIRING (LangGraph TS / @langchain/langgraph 1.3.x) ===
// Drops into cli-ts starter's src/agent.ts placeholder.
//
// Verified against:
//  - @langchain/langgraph 1.3.2 (prebuilt createReactAgent signature)
//  - @langchain/mcp-adapters 1.1.3 (MultiServerMCPClient.getTools)
//  - LangChain core message API (AIMessageChunk, ToolMessage)
//
// Install (in the starter project):
//   pnpm add @langchain/langgraph @langchain/anthropic @langchain/core \
//            @langchain/mcp-adapters zod
//   # optional providers: @langchain/openai
//   # optional persistence: already exported from @langchain/langgraph (MemorySaver)
// ====================================================================

import { ChatAnthropic } from '@langchain/anthropic';
// SKILL: swap provider — e.g. `import { ChatOpenAI } from '@langchain/openai';`
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import {
  AIMessageChunk,
  isAIMessageChunk,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
// import { MemorySaver } from '@langchain/langgraph';   // SKILL: uncomment for persistence
// import { tool } from '@langchain/core/tools';          // SKILL: uncomment to add local tools
// import { z } from 'zod';                                // SKILL: uncomment to add local tools

import { enabledMcpServers, type McpServerConfig } from './tools/mcp-config.js';

// ----- Public event contract (re-exported so cli/render.ts can import from here) -----
export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: any }
  | { type: 'tool_result'; id: string; result: any; isError?: boolean }
  | { type: 'error'; error: string };

// ----- SKILL: insertion points -----
const SYSTEM_PROMPT = 'You are a helpful assistant.';

// SKILL: native (non-MCP) tools go here. Example:
//   const search = tool(async ({ query }) => `...`, {
//     name: 'search', description: 'Web search', schema: z.object({ query: z.string() }),
//   });
const LOCAL_TOOLS: any[] = [];

// SKILL: per-call config (thread_id is required when checkpointSaver is enabled).
const THREAD_ID = 'default-thread';

// ----- Retry wrapper (SKILL: configure thresholds / which errors are retryable) -----
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 3;
  const baseMs = opts.baseMs ?? 500;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = (err as any)?.status ?? (err as any)?.response?.status;
      const retryable =
        status === 429 || (typeof status === 'number' && status >= 500 && status < 600);
      if (!retryable || attempt === retries) break;
      const delay = baseMs * 2 ** attempt + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ----- Lazy MCP wiring -----
// Translates the starter's {name, command, args, env} shape to MultiServerMCPClient's
// {[name]: {transport: 'stdio', ...}} ctor shape. Lazy so the CLI starts fast.
let mcpToolsPromise: Promise<any[]> | null = null;
async function loadMcpTools(): Promise<any[]> {
  if (mcpToolsPromise) return mcpToolsPromise;
  const servers = enabledMcpServers();
  if (servers.length === 0) {
    mcpToolsPromise = Promise.resolve([]);
    return mcpToolsPromise;
  }
  const config: Record<string, any> = {};
  for (const s of servers as McpServerConfig[]) {
    config[s.name] = {
      transport: 'stdio',
      command: s.command,
      args: s.args ?? [],
      ...(s.env ? { env: s.env } : {}),
    };
  }
  mcpToolsPromise = (async () => {
    const client = new MultiServerMCPClient(config);
    return await client.getTools();
  })();
  return mcpToolsPromise;
}

// ----- Agent factory (cached) -----
// TODO: verify on SDK upgrade — @langchain/langgraph 1.3.x prebuilt accepts
// `{ llm, tools }`. Earlier 0.x examples used `{ model, tools }`; if you bump
// the SDK and TS complains, swap `llm:` for `model:`.
let agentPromise: ReturnType<typeof buildAgent> | null = null;
async function buildAgent() {
  const llm = new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    // SKILL: tune temperature, max_tokens, thinking budget, etc.
  });
  const mcpTools = await loadMcpTools();
  const tools = [...LOCAL_TOOLS, ...mcpTools];
  return createReactAgent({
    llm, // see TODO above
    tools,
    prompt: SYSTEM_PROMPT,
    // SKILL: uncomment for cross-turn memory. Requires THREAD_ID in stream config.
    //   const memory = new MemorySaver();
    //   checkpointSaver: memory,
  });
}
function getAgent() {
  if (!agentPromise) agentPromise = buildAgent();
  return agentPromise;
}

// ----- Helpers -----
function extractTextDelta(chunk: AIMessageChunk): string {
  const content = chunk.content as unknown;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    // Anthropic-style content blocks: take text blocks, skip thinking/tool_use.
    let out = '';
    for (const block of content as any[]) {
      if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') {
        out += block.text;
      }
    }
    return out;
  }
  return '';
}

function isToolMessage(msg: BaseMessage): msg is ToolMessage {
  return (msg as any).getType?.() === 'tool' || msg instanceof ToolMessage;
}

function toolResultIsError(msg: ToolMessage): boolean {
  // LangChain v1 surfaces tool errors as ToolMessage.status === 'error'.
  // SKILL: extend if your tools signal errors via additional_kwargs or content shape.
  const status = (msg as any).status;
  if (status === 'error') return true;
  if ((msg as any).additional_kwargs?.error) return true;
  return false;
}

// ----- Main entry: streamAgent -----
export async function* streamAgent(
  prompt: string,
  history: any[] = [],
): AsyncGenerator<AgentEvent> {
  let stream: AsyncIterable<any>;
  try {
    const agent = await getAgent();
    const input = {
      messages: [...history, { role: 'user', content: prompt }],
    };
    // streamMode: ["messages", "updates"]  →  chunks arrive as ["messages", [chunk, meta]]
    // or ["updates", {nodeName: {messages: [...]}}]. We use "messages" for token
    // deltas and "updates" to surface finalized tool_use / tool_result events.
    stream = await withRetry(() =>
      agent.stream(input, {
        streamMode: ['messages', 'updates'],
        // SKILL: enable when checkpointSaver is set above:
        // configurable: { thread_id: THREAD_ID },
      }),
    );
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : String(err) };
    return;
  }

  const emittedToolCallIds = new Set<string>();

  try {
    for await (const part of stream) {
      const [mode, data] = part as [string, any];

      if (mode === 'messages') {
        const [msg, _meta] = data as [BaseMessage, Record<string, unknown>];
        if (isAIMessageChunk(msg)) {
          const delta = extractTextDelta(msg);
          if (delta) yield { type: 'text', delta };
        }
        continue;
      }

      if (mode === 'updates') {
        // data is { [nodeName]: { messages: BaseMessage[] } } — usually 'agent' or 'tools'.
        for (const nodeUpdate of Object.values(data ?? {}) as any[]) {
          const messages: BaseMessage[] = nodeUpdate?.messages ?? [];
          for (const msg of messages) {
            // Finalized AIMessage: emit any tool_use calls now that args are fully parsed.
            const toolCalls = (msg as any).tool_calls as
              | Array<{ id?: string; name: string; args: any }>
              | undefined;
            if (toolCalls && toolCalls.length > 0) {
              for (const tc of toolCalls) {
                const id = tc.id ?? `${tc.name}-${emittedToolCallIds.size}`;
                if (emittedToolCallIds.has(id)) continue;
                emittedToolCallIds.add(id);
                yield { type: 'tool_use', id, name: tc.name, input: tc.args };
              }
            }
            // ToolMessage: emit tool_result with the same id the model used.
            if (isToolMessage(msg)) {
              yield {
                type: 'tool_result',
                id: (msg as any).tool_call_id ?? '',
                result: msg.content,
                isError: toolResultIsError(msg),
              };
            }
          }
        }
      }
    }
  } catch (err) {
    yield { type: 'error', error: err instanceof Error ? err.message : String(err) };
  }
}

// === END AGENT WIRING ===
