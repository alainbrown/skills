# Vercel AI SDK

## Identity
- Repo: https://github.com/vercel/ai
- Language: TypeScript only
- License: Apache 2.0
- Track: A (library import — primitives, you build the loop)
- Latest stable: `ai@6.0.191` as of 2026-05-26 (v6 is GA; v5.x is the prior major)
- Package: `ai` (core), `@ai-sdk/<provider>` (per-provider), `@ai-sdk/mcp` (MCP — split out of core in v6)

## Positioning vs other Track A harnesses
- This is NOT an agent framework. The `ai` package ships streaming/tool-call primitives and a thin loop (`stopWhen`); you write everything else. Pick this when you want minimal abstraction and you're comfortable owning the agentic control flow, message store, and persistence.
- vs Mastra: Mastra is built ON Vercel AI SDK + adds `Agent`/`Memory`/`Workflow`/`mastra dev` playground. Pick Vercel AI SDK if you want what's underneath without the extra primitives.
- vs OpenAI Agents SDK: that one bundles handoffs, voice (`gpt-realtime`), and OpenAI dashboard tracing. Pick Vercel AI SDK if you don't need handoffs/voice and want provider neutrality.
- vs LangGraph: graph-based orchestration with checkpoints. Pick Vercel AI SDK if your control flow is linear/simple and you don't need graph state machines.

Two viable mental models inside this SDK:
1. **Loop primitive** — `streamText({ ..., stopWhen: stepCountIs(N) })` is the agentic loop. It auto-continues after tool calls until no more tool calls or step limit. This is the simplest path and what we use below.
2. **`ToolLoopAgent` class** — new in v6; wraps `streamText` in an `Agent`-shaped object so you can pass it to `createAgentUIStream`. Useful for Next.js UI integrations. // TODO: verify the long-term position of this class — it appeared in v6 and may converge with a fuller agent surface.

## Install
- `pnpm add ai @ai-sdk/anthropic zod` (swap provider package as needed)
- For MCP: `pnpm add @ai-sdk/mcp` (split out of `ai` in v6; was `experimental_createMCPClient` from `ai` in v5)
- Required env: provider-specific — `ANTHROPIC_API_KEY` for `@ai-sdk/anthropic`, `OPENAI_API_KEY` for `@ai-sdk/openai`, etc. Or `AI_GATEWAY_API_KEY` + the gateway-string model form to route through Vercel AI Gateway.

## Minimum working agent
```typescript
// VERIFIED FROM: ai-sdk.dev/docs/foundations/agents and /ai-sdk-core/generating-text (v6)
import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const result = streamText({
  model: anthropic("claude-opus-4-7"), // or gateway string: "anthropic/claude-sonnet-4.5"
  system: "You are a helpful assistant.",
  prompt: "List files in this directory.",
  tools: {
    listFiles: tool({
      description: "List files in a directory.",
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path }) => {
        const fs = await import("node:fs/promises");
        return await fs.readdir(path);
      },
    }),
  },
  stopWhen: stepCountIs(10),
});

// Two iteration surfaces:
for await (const delta of result.textStream) process.stdout.write(delta); // text-only
// or
for await (const chunk of result.fullStream) { /* typed events */ }
```

## Tool registration
- `tool({ description, inputSchema, execute })` from the `ai` package. Field is `inputSchema` in v6 (was `parameters` in v4 and earlier — easy footgun if you copy old code).
- Tools passed as an OBJECT keyed by name: `{ toolName: tool({...}), ... }`. Same shape Mastra and LangGraph (with the AI-SDK provider) consume — common-tools/ts/*.ts drop in directly.
- Schemas: zod is canonical; JSON Schema also accepted via `inputSchema`.

## Streaming — `fullStream` chunk types
`fullStream` emits typed events. Discriminator is `part.type`. Verified set in v6:
- Lifecycle: `start`, `start-step`, `finish-step`, `finish`
- Text: `text-start`, `text-delta`, `text-end`
- Reasoning (Anthropic, o-series): `reasoning-start`, `reasoning-delta`, `reasoning-end`
- Tools: `tool-input-start`, `tool-input-delta`, `tool-input-end`, `tool-call`, `tool-result`, `tool-error`
- Other: `source`, `file`, `error`, `raw`

Chunk shapes (verified):
- `tool-call`: `{ type: "tool-call", toolCallId: string, toolName: string, input: object }`
- `tool-result`: `{ type: "tool-result", toolCallId: string, toolName: string, input: object, output: any }`
- `text-delta`: `{ type: "text-delta", id: string, text: string }` // TODO: verify the exact text-delta payload field name — older versions used `textDelta`, v6 docs render it as `text` on the part itself.

Note: `tool-call` exposes `input` (not `args` — that was a v4/early-v5 naming). `tool-result` exposes `output` (not `result`).

## MCP support
- Package: `@ai-sdk/mcp` (split out of `ai` in v6; still exported as `experimental_createMCPClient` — the prefix has NOT been removed yet).
- Transports: stdio (via `Experimental_StdioMCPTransport` from `@ai-sdk/mcp/mcp-stdio`), HTTP (`{ type: "http", url }`), SSE (`{ type: "sse", url }`).
- `client.tools()` returns an object keyed by tool name in the AI SDK `tool()` shape — drops directly into `tools:` on `streamText` (spread alongside your custom tools).
- Lifecycle: caller's responsibility. Close clients in `finally`, or via `onFinish`/`onError` callbacks on `streamText`.

```typescript
// VERIFIED FROM: ai-sdk.dev/docs/ai-sdk-core/mcp-tools (v6)
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";

const client = await createMCPClient({
  transport: new Experimental_StdioMCPTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
  }),
});
const mcpTools = await client.tools();
// ...use mcpTools in streamText({ tools: { ...customTools, ...mcpTools } })
// later: await client.close();
```

## Multi-step / agentic loop
- `streamText({ ..., stopWhen: stepCountIs(N) })` — the SDK auto-continues steps after every tool call until either no more tool calls remain or the step limit hits. This IS the agentic loop primitive.
- `stopWhen` accepts an array of conditions (OR-combined) or a single predicate. Other built-ins: `hasToolCall(name)`, plus custom `(step) => boolean`.
- Per-step hook: `onStepFinish({ stepResult, toolCalls, toolResults })` — useful for logging or human-in-the-loop gates.
- Manual control: omit `stopWhen` and inspect `result.finishReason`/`result.steps` to decide whether to fire another `streamText` call yourself. This is the "I really want to own the loop" path.

## Memory / persistence
- NOT shipped. You manage message history yourself — an array of `UIMessage` (UI-side) or `ModelMessage` (provider-side). Use `convertToModelMessages(uiMessages)` to translate.
- For conversation persistence: write your own storage adapter (sqlite via better-sqlite3, LibSQL, Postgres, Drizzle, etc.).
- This is THE tradeoff vs Mastra/LangGraph — minimal abstraction means you wire memory, summarization, and recall yourself.

## Provider switching
- Anthropic, OpenAI, Google, Mistral, Cohere, Groq, AWS Bedrock, GCP Vertex, Azure, xAI, DeepSeek, Ollama, etc. — all via `@ai-sdk/<provider>` packages. Swap one import + one factory call.
- Vercel AI Gateway: pass the model as a string like `"anthropic/claude-sonnet-4.5"` to `streamText({ model: "..." })`. No provider import needed; the gateway resolves it. Requires `AI_GATEWAY_API_KEY`.

## Interface compatibility
- CLI: trivial (call `streamText` from a readline / Ink loop; iterate `textStream` or `fullStream`).
- Web: TRIVIAL — Vercel AI SDK is the canonical primitive for Vercel's `useChat` hook. `streamText().toUIMessageStreamResponse()` returns a ready-to-pipe `Response`. Drop-in with Next.js, SvelteKit, Nuxt, etc.
- Electron: trivial — call from main process exactly like a Node CLI; bridge events to the renderer via IPC.

## Known fragile patterns
- `parameters` vs `inputSchema`: pre-v5 code used `parameters`. v6 uses `inputSchema` exclusively. Copying old StackOverflow examples will silently fail with "tool has no parameters" errors.
- `args` vs `input`, `result` vs `output`: in `fullStream` `tool-call`/`tool-result` chunks, v6 uses `input` and `output`. v4/early-v5 used `args`/`result`. This bit Mastra/LangGraph translation code too.
- `experimental_` prefix on MCP has NOT been removed in v6 — pin a minor of `@ai-sdk/mcp` and treat its surface as unstable.
- `@ai-sdk/mcp` was an `experimental_createMCPClient` export of `ai` in v5; it's a separate package in v6. Migration footgun.
- `text-delta` chunk: docs render the text field as `part.text` but some older type defs name it `textDelta`. // TODO: verify against installed `ai@6.0.x` types.
- `tool-error` is a SEPARATE chunk type from `error`. `tool-error` fires when an `execute` function throws; `error` fires for transport/protocol errors. Handle both.
- `ToolLoopAgent` is new in v6 and the surface may keep moving — prefer `streamText + stopWhen` for stable production code today.

## Common tools layer
- **Needs common-tools layer**: YES. `ai` ships primitives, not tools. Our `references/common-tools/ts/` directory ships `bash`, `file-read`, `file-write`, `file-edit`, `glob`, `grep`, `web-fetch` — all built with `tool()` from `ai`, so they drop straight into Vercel AI SDK projects with no rewrap.
- **Recommended approach**: same as Mastra (bespoke individual tools OR `vercel-labs/just-bash + bash-tool`). See `references/common-tools/README.md`.

## Tests / runner
- vitest. Mock the model by replacing the provider call with a fake `LanguageModelV2` instance, or use the SDK's `MockLanguageModelV2` test helper from `ai/test`.
