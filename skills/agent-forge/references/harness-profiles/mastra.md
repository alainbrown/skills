# Mastra

## Identity
- Repo: https://github.com/mastra-ai/mastra
- Language: TypeScript only
- License: Apache 2.0 for core; Mastra Enterprise License for `ee/` directories (source-available)
- Track: A
- Latest stable: `@mastra/core@1.35.0` as of 2026-05-25

## Install
- `npm create mastra@latest` (canonical) or `pnpm dlx create-mastra@latest` — CLI scaffolds a Mastra project
- Or manual: `pnpm add @mastra/core zod` plus a provider package for tool/streaming integration (e.g. `@ai-sdk/anthropic`, `@ai-sdk/openai`) when you want a model instance rather than the model-router string
- Required env: provider keys in `.env` (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`)

## Minimum working agent
```typescript
// VERIFIED FROM: https://mastra.ai/docs/agents/overview and /docs/streaming/overview
import { Agent } from "@mastra/core/agent";

// Mastra's model router accepts a "provider/model-name" string,
// resolving to an AI-SDK-compatible model under the hood.
const agent = new Agent({
  id: "helper",
  name: "Helper",
  instructions: "You are a helpful assistant.",
  model: "anthropic/claude-opus-4-7", // TODO: verify exact model slug at runtime
  tools: { /* { [id]: Tool } — see Tool registration below */ },
});

// Generate
const result = await agent.generate("Hello");
console.log(result.text);

// Stream (V2 models, AI SDK v5+ compatible)
const stream = await agent.stream([{ role: "user", content: "Help me plan my day" }]);
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

Alternative: pass an AI SDK model instance instead of the router string:
```typescript
import { anthropic } from "@ai-sdk/anthropic";
const agent = new Agent({ id: "helper", name: "Helper", instructions: "...", model: anthropic("claude-opus-4-7") });
```

## Tool registration
- Server-side: `createTool` from `@mastra/core/tools` — `id`, `description`, `inputSchema` (zod), `outputSchema` (zod), `execute`.
- Client-side (browser): `createTool` from `@mastra/client-js` (passed via `clientTools` option to `generate`/`stream`).
```typescript
// VERIFIED FROM: https://mastra.ai/docs/agents/using-tools
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const echoTool = createTool({
  id: "echo",
  description: "Echo the input text",
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ echoed: z.string() }),
  execute: async ({ inputData }) => ({ echoed: inputData.text }),
});

// Attach to agent
new Agent({ id: "a", name: "A", instructions: "...", model: "openai/gpt-5.4", tools: { echoTool } });
```

## MCP support
- Package: `@mastra/mcp` (verified). Class `MCPClient` supports stdio (`command`/`args`) and HTTP/SSE (`url`).
```typescript
// VERIFIED FROM: https://mastra.ai/docs/mcp/overview
import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";

const mcp = new MCPClient({
  id: "tools-mcp",
  servers: {
    wikipedia: { command: "npx", args: ["-y", "wikipedia-mcp"] },
    weather: { url: new URL("https://server.smithery.ai/.../mcp?api_key=...") },
  },
});

export const agent = new Agent({
  id: "researcher",
  name: "Researcher",
  instructions: "Use MCP tools to answer.",
  model: "anthropic/claude-opus-4-7",
  tools: await mcp.listTools(),
});
```

## Workflows (Mastra's other primitive)
Mastra has `Workflow` separate from `Agent` for deterministic step pipelines. Compose steps with `createStep` + `createWorkflow` from `@mastra/core/workflows`, chain with `.then(...).map(...).then(...).commit()`. Steps have zod `inputSchema`/`outputSchema` and may declare `suspendSchema`/`resumeSchema` for human-in-the-loop. A tool can be wrapped as a step via `createStep(tool)`. Use Agent for open-ended LLM reasoning, Workflow for graphs you need to be deterministic, suspendable, and observable.

## Memory
- Package: `@mastra/memory`. Built-in: working memory (structured, zod-schema or markdown template), semantic recall, and observational memory.
```typescript
// VERIFIED FROM: https://mastra.ai/docs/memory/working-memory
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

const agent = new Agent({
  id: "personal-assistant",
  name: "PersonalAssistant",
  instructions: "You are a helpful personal assistant.",
  model: "openai/gpt-5.4",
  memory: new Memory({ options: { workingMemory: { enabled: true } } }),
});
```
Resource-scoped memory (`scope: 'resource'`) requires a storage adapter supporting `mastra_resources`.

## Built-in playground
- `mastra dev` launches a local dev server + visual playground ("Studio") for testing agents, tools, and workflows interactively — significant differentiator vs other Track A frameworks. This makes a "Web" interface essentially free for development; production web is Next.js + AI SDK or the Mastra server.

## Streaming
- `agent.stream(messages)` returns an AI SDK v5–compatible stream with `.textStream` (text chunks) and `.fullStream` (typed events including tool-call, tool-result, finish, etc.).
- For AI SDK v5+ UI integration: `toAISdkV5Stream()` from `@mastra/ai-sdk` and `toAISdkV5Messages()` from `@mastra/ai-sdk/ui`.

## Interface compatibility
- CLI: trivial — call `agent.generate` / `agent.stream` from a Node script.
- Web: TRIVIAL — `mastra dev` gives an immediate playground; for production, drop into Next.js with AI SDK or use Mastra's built-in HTTP server (Hono-based) with `mastraClient.getAgent(...)`.
- Electron: medium — Mastra runs in Node, so a main-process Mastra server + IPC bridge works. No first-class Electron template. TODO: verify Electron packaging story.

## Eval support
- Built-in evals package — define metrics, attach to agents/workflows, run via CLI or programmatically. Mastra also auto-emits duration, token, and cost metrics (observability). One-liner: if the user wants eval-driven dev, Mastra is the easiest Track A path. TODO: verify exact package name (`@mastra/evals`) and current API surface.

## Multi-agent
- Workflows can orchestrate multiple agents as steps (call `agent.generate` inside `execute`, or wrap an agent as a step). Yes, but not graph-native the way LangGraph is — Mastra workflows are a DAG/sequential composer, not a message-passing agent graph.

## Known fragile patterns
- Model field: the `'provider/model-name'` router string is the documented quickstart form, but exact slug for newest Anthropic/OpenAI models drifts — TODO: verify the live slug (e.g. `anthropic/claude-opus-4-7` vs alternative) before shipping; falling back to an AI SDK provider import (`anthropic("...")`) is safer.
- Two `createTool` exports exist (`@mastra/core/tools` server-side vs `@mastra/client-js` browser-side) — easy to import the wrong one.
- Streaming has V1/V2 model split; the `for await (stream.textStream)` shape shown here is V2/AI-SDK-v5+.
- `mastraClient.getAgent(...).stream()` uses `stream.processDataStream({ onTextPart })` — different shape from server-side `agent.stream()`.
- Working memory `template` and `schema` are mutually exclusive — set only one.

## Provider support
- Anthropic, OpenAI, Google (Gemini), Mistral, Groq, Cohere, ElevenLabs (voice), and 40+ others via the AI SDK ecosystem and Mastra's model router.

## Common tools layer
- **Needs common-tools layer**: YES. Mastra ships the Agent primitive + `createTool` but no general-purpose tool kit.
- **Recommended approach**: see `references/common-tools/README.md`. As TS-only, both paths available: bespoke individual tools (drop into project, AI SDK `tool()` shape — Mastra consumes AI SDK tools directly) OR `vercel-labs/just-bash + bash-tool` framework.

## Tests / runner
- vitest (Mastra repo uses it; idiomatic for generated projects)
