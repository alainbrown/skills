# web-ts — Next.js chat starter for agent-forge

A bootable Next.js 15 (App Router) chat UI that ships with a placeholder
agent. The `agent-forge` skill drops in a real harness (Anthropic SDK,
AI SDK, OpenAI Agents SDK, etc.) by replacing `src/agent.ts`. Nothing
else needs to change.

## Stack

- **Next.js 15** (App Router, React 19, Turbopack dev)
- **TypeScript** in strict mode
- **Tailwind CSS v4** (CSS-first config; `@import "tailwindcss"` in `globals.css`)
- **shadcn/ui** primitives (`button`, `input`, `card`, `scroll-area`, `skeleton`, `tooltip`)
- **AI SDK v5** deps pre-installed (`ai`, `@ai-sdk/react`) for harness snippets that want them
- **Vitest + Testing Library** for unit/component tests

## Quick start

```bash
pnpm install
cp .env.example .env.local      # optional — only needed once you swap in a real agent
pnpm dev
```

Open <http://localhost:3000>. Type a message — the placeholder agent
will stream a short echo back, character by character, so you can
confirm SSE works end-to-end.

## Streaming protocol

The route at **`src/app/api/chat/route.ts`** consumes the async generator
exported by `src/agent.ts` and forwards each `AgentEvent` to the browser
as a Server-Sent Event (`text/event-stream`, one JSON object per
`data:` line, terminated by `data: [DONE]`).

The client (`src/lib/stream.ts`) parses that stream back into
`AgentEvent`s and `src/components/chat.tsx` folds them into the
message list. The contract is:

```ts
type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; result: unknown; isError?: boolean }
  | { type: 'error'; error: string };
```

This protocol stays stable across harness swaps — only `src/agent.ts`
changes. The AI SDK v5 packages are installed so harness snippets that
prefer `streamText` + `useChat` can opt in without re-running `pnpm add`.

### Why manual SSE instead of `useChat`?

`AgentEvent` is the contract every harness produces, so emitting it
verbatim on the wire keeps the route trivial:
`for await (const evt of streamAgent(...))  controller.enqueue(...)`.
Path A (AI SDK `createUIMessageStream`) would force every harness to
translate to AI SDK part types. Either is defensible — see the harness
snippets for examples that use AI SDK on both ends.

## Replacing the agent

1. Drop your harness wiring into `src/agent.ts` between the
   `=== BEGIN AGENT WIRING ===` / `=== END AGENT WIRING ===` markers.
2. Keep the `streamAgent(prompt, history): AsyncGenerator<AgentEvent>`
   signature.
3. Add any new env vars to `.env.example`.
4. Register MCP servers in `src/lib/tools/mcp-config.ts`; put custom
   tools under `src/lib/tools/custom/`.

The UI, API route, tests, and styles do not need to change.

## Scripts

| Script             | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `pnpm dev`         | Turbopack dev server on :3000            |
| `pnpm build`       | Production build (also catches TS errors)|
| `pnpm start`       | Run the production build                 |
| `pnpm lint`        | ESLint (Next.js config)                  |
| `pnpm typecheck`   | `tsc --noEmit`                           |
| `pnpm test`        | Vitest one-shot run                      |
| `pnpm test:watch`  | Vitest watch mode                        |

## Project layout

```
src/
  agent.ts                 # PLACEHOLDER — replace with harness wiring
  app/
    api/chat/route.ts      # POST /api/chat — streams SSE
    globals.css            # Tailwind v4 + theme tokens
    layout.tsx
    page.tsx
  components/
    chat.tsx               # Top-level chat client component
    message.tsx            # User/assistant bubble + markdown + copy
    tool-invocation.tsx    # Collapsible tool call card
    input-bar.tsx          # Auto-growing textarea + send/stop
    ui/                    # shadcn primitives
  hooks/
    use-sticky-scroll.ts   # Pin-to-bottom while content streams
  lib/
    chat-types.ts          # Client-side message model
    stream.ts              # SSE reader → AsyncIterable<AgentEvent>
    utils.ts               # cn() helper
    tools/
      mcp-config.ts        # MCP server registry (empty by default)
      custom/               # Hand-written tools (empty by default)
tests/
  chat.test.tsx
  tools/registry.test.ts
```

## Environment variables

See `.env.example`. Only `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_APP_TAGLINE`
are read by the starter itself — the rest are placeholders that whatever
harness you wire in will need.
