// === BEGIN AGENT WIRING (vercel-ai-sdk / TypeScript) ===
// Harness: ai (>=6.0.191) + @ai-sdk/anthropic (>=3.0.79) + @ai-sdk/mcp (>=1.0.43)
// Profile: references/harness-profiles/vercel-ai-sdk.md
//
// Positioning: minimal abstraction — you own the loop. No Agent class,
// no Memory primitive. The "loop" is `streamText({ stopWhen: stepCountIs(N) })`
// which auto-continues steps after tool calls until no more calls or N hits.
//
// This snippet replaces src/agent.ts in the starter. It exposes:
//   - streamAgent(prompt, history?) — AsyncGenerator<AgentEvent>
//   - AgentEvent (re-exported)
//
// Customization points are marked `// SKILL:`.
// Items requiring runtime verification against the installed SDK version are
// marked `// TODO: verify`.
// === END AGENT WIRING ===

import { streamText, tool, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
// SKILL: swap the provider import if state.harness.modelId targets a non-Anthropic
// model — e.g. `import { openai } from "@ai-sdk/openai"` and `openai("gpt-4o")`.
// Or skip the import entirely and pass a gateway string like
//   model: "anthropic/claude-sonnet-4.5"
// to `streamText` directly (requires AI_GATEWAY_API_KEY).
import {
  experimental_createMCPClient as createMCPClient,
} from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
// TODO: verify — in @ai-sdk/mcp@1.0.x the createMCPClient export is still
// prefixed `experimental_`. HTTP/SSE transports are configured inline as
// `{ type: "http" | "sse", url, headers? }` and do NOT need a separate
// transport class import.
import { z } from "zod";

// ---------------------------------------------------------------------------
// AgentEvent — the starter's wire-format. Must match src/agent.ts contract.
// ---------------------------------------------------------------------------
export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool_use"; id: string; name: string; input: any }
  | { type: "tool_result"; id: string; result: any; isError?: boolean }
  | { type: "error"; error: string };

// ---------------------------------------------------------------------------
// Prompt + config
// ---------------------------------------------------------------------------
// SKILL: replace this entire string from state.agent.systemPrompt.
const SYSTEM_PROMPT = `You are a helpful assistant.`;

// SKILL: MCP servers from state.tools.mcpServers. Each entry is one of:
//   { kind: "stdio", command: string, args?: string[], env?: Record<string,string> }
//   { kind: "http",  url: string, headers?: Record<string,string> }
//   { kind: "sse",   url: string, headers?: Record<string,string> }
// Empty array skips MCP entirely.
type McpServerConfig =
  | { kind: "stdio"; command: string; args?: string[]; env?: Record<string, string> }
  | { kind: "http"; url: string; headers?: Record<string, string> }
  | { kind: "sse"; url: string; headers?: Record<string, string> };

const MCP_SERVERS: McpServerConfig[] = [
  // { kind: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] },
  // { kind: "http", url: "http://localhost:3000/mcp", headers: { Authorization: "Bearer ..." } },
];

// SKILL: add custom tools here. Each is built with `tool()` from `ai` and
// keyed by name. They merge with MCP tools at streamText call time. Our
// common-tools/ts/*.ts modules (bash, file-read, file-write, glob, grep,
// web-fetch) export ready-made `tool()` instances and drop in directly.
//
// Note v6 uses `inputSchema` (NOT `parameters` — that was v4 and earlier).
const TOOLS: Record<string, ReturnType<typeof tool>> = {
  // _echo: tool({
  //   description: "Echo the input text",
  //   inputSchema: z.object({ text: z.string() }),
  //   execute: async ({ text }) => ({ echoed: text }),
  // }),
};

// Touch `z` so unused-import lints stay quiet until real tools land.
void z;

// SKILL: model selection — docs-default per profile. state.harness.modelId
// can override. Two call forms:
//   (a) provider instance:  anthropic("claude-opus-4-7")   ← used below
//   (b) gateway string:     "anthropic/claude-sonnet-4.5"  ← needs AI_GATEWAY_API_KEY
// We use the provider-instance form for stronger types and a pinned dep.
const MODEL_ID = process.env.AGENT_MODEL_ID ?? "claude-opus-4-7";

function buildModel() {
  return anthropic(MODEL_ID);
}

// SKILL: max steps for the agentic loop. The SDK auto-continues after each
// tool call until either no more tool calls or this limit. Configure from
// state.harness.maxSteps if exposed.
const MAX_STEPS = 10;

// ---------------------------------------------------------------------------
// Retry helper — SKILL: configure maxAttempts / baseDelayMs from state.ux.errorPolicy.
//   llm_failure: 'fail-fast' -> maxAttempts = 1
//   llm_failure: 'retry'     -> maxAttempts = 3 (default below)
// ---------------------------------------------------------------------------
async function withRetry<T>(
  factory: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await factory();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// MCP client construction — one per configured server.
// ---------------------------------------------------------------------------
async function buildMcpClient(cfg: McpServerConfig) {
  if (cfg.kind === "stdio") {
    return createMCPClient({
      transport: new Experimental_StdioMCPTransport({
        command: cfg.command,
        args: cfg.args ?? [],
        env: cfg.env,
      }),
    });
  }
  // http | sse — inline transport config (no separate transport class needed)
  return createMCPClient({
    transport: {
      type: cfg.kind,
      url: cfg.url,
      headers: cfg.headers,
    } as any, // TODO: verify — the inline transport type narrows on `type` in @ai-sdk/mcp@1.0.x
  });
}

// ---------------------------------------------------------------------------
// streamAgent — primary contract consumed by the starter.
// ---------------------------------------------------------------------------
// `history` is a list of prior ModelMessage entries. We append a new user
// turn and pass `messages` to streamText. Vercel AI SDK ships no Memory
// primitive — persisting/loading the history is the caller's job.
export async function* streamAgent(
  prompt: string,
  history?: ModelMessage[],
): AsyncGenerator<AgentEvent> {
  // ---- Instantiate MCP clients (lifecycle = ours) -----------------------
  const mcpClients: Array<Awaited<ReturnType<typeof createMCPClient>>> = [];
  try {
    let mcpTools: Record<string, any> = {};
    for (const cfg of MCP_SERVERS) {
      const client = await buildMcpClient(cfg);
      mcpClients.push(client);
      // `client.tools()` returns an object of tool() instances keyed by name,
      // already in the shape `streamText({ tools })` consumes. Spread merge.
      const fromServer = await client.tools();
      mcpTools = { ...mcpTools, ...fromServer };
    }

    // ---- Compose messages ------------------------------------------------
    const messages: ModelMessage[] = [
      ...(history ?? []),
      { role: "user", content: prompt },
    ];

    // ---- Fire the agentic loop ------------------------------------------
    // `streamText` returns synchronously; the work happens lazily as we
    // iterate `fullStream`. `stopWhen: stepCountIs(N)` makes this multi-step:
    // after each tool call the SDK feeds the result back to the model and
    // continues until no more tool calls or N steps elapse.
    //
    // SKILL: add `onStepFinish` callback if state.ux needs per-step hooks.
    const result = await withRetry(async () =>
      streamText({
        model: buildModel(),
        system: SYSTEM_PROMPT,
        messages,
        tools: { ...TOOLS, ...mcpTools },
        stopWhen: stepCountIs(MAX_STEPS),
      }),
    );

    // ---- Iterate fullStream, translate chunks to AgentEvent -------------
    // v6 chunk types we care about:
    //   text-delta   → { type: "text-delta", id, text }
    //   tool-call    → { type: "tool-call", toolCallId, toolName, input }
    //   tool-result  → { type: "tool-result", toolCallId, toolName, input, output }
    //   tool-error   → { type: "tool-error", toolCallId, toolName, input, error }
    //   error        → { type: "error", error }
    //
    // Other emitted types (start, start-step, finish, finish-step, text-start,
    // text-end, reasoning-*, tool-input-*, source, file, raw) are intentionally
    // ignored — they aren't part of the AgentEvent contract. SKILL: add cases
    // if the produced agent needs reasoning streams or step-level metadata.
    for await (const part of result.fullStream as AsyncIterable<any>) {
      switch (part.type) {
        case "text-delta": {
          // TODO: verify — v6 docs render the text on `part.text`, but some
          // older type defs name it `textDelta`. Read both defensively.
          const delta: string = part.text ?? part.textDelta ?? "";
          if (delta) yield { type: "text", delta };
          break;
        }
        case "tool-call": {
          yield {
            type: "tool_use",
            id: part.toolCallId ?? "",
            name: part.toolName ?? "",
            input: part.input ?? {},
          };
          break;
        }
        case "tool-result": {
          yield {
            type: "tool_result",
            id: part.toolCallId ?? "",
            result: part.output,
          };
          break;
        }
        case "tool-error": {
          // execute() threw — surface as a failed tool_result so callers can
          // distinguish from a transport error (which arrives as "error").
          yield {
            type: "tool_result",
            id: part.toolCallId ?? "",
            result:
              part.error instanceof Error
                ? part.error.message
                : String(part.error),
            isError: true,
          };
          break;
        }
        case "error": {
          // SKILL: route through state.ux.errorPolicy (classify / redact).
          const err = part.error;
          const msg = err instanceof Error ? err.message : String(err);
          yield { type: "error", error: msg };
          break;
        }
        default:
          break;
      }
    }
  } catch (err) {
    // SKILL: route through state.ux.errorPolicy here too — this catches
    // failures outside the stream (MCP startup, model construction, retry
    // exhaustion) rather than inside an SDK error chunk.
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    yield { type: "error", error: msg };
  } finally {
    // Best-effort MCP client cleanup. Lifecycle is the caller's responsibility
    // per @ai-sdk/mcp docs; close errors must not mask a useful upstream error.
    await Promise.allSettled(mcpClients.map((c) => c.close()));
  }
}
