# api-ts — Hono agent-as-API starter for agent-forge

A bootable, runtime-portable HTTP API that wraps an agent and exposes it
via Server-Sent Events. Drop in any harness (Anthropic SDK, AI SDK,
OpenAI Agents SDK, etc.) by replacing `src/agent.ts`; nothing else needs
to change.

Use this starter when the agent is a **feature inside someone else's
product**: B2B embeds, image/asset generators driven by a prompt + input,
webhook-triggered automations, or APIs consumed by frontends you own
separately.

## Stack

- **Hono 4** — TypeScript-first, runs on Node, Bun, Cloudflare Workers,
  Vercel Edge, and Deno without code changes
- **@hono/zod-openapi** — request/response schemas generate an OpenAPI
  3.1 document for free
- **@hono/swagger-ui** — interactive docs at `/docs`
- **Zod** — input validation; bad requests get a `400` with a structured
  error payload
- **Vitest** — drives the app with `app.request(...)` (no live HTTP)

## Quick start

```bash
pnpm install
cp .env.example .env          # optional — only needed when you swap in a real agent
pnpm dev                      # tsx watch on src/server.ts
```

Then in another shell:

```bash
# Health check
curl -s http://localhost:3000/api/health | jq

# Stream a chat completion (SSE)
curl -N -X POST http://localhost:3000/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

- **Swagger UI:**     <http://localhost:3000/docs>
- **OpenAPI spec:**   <http://localhost:3000/openapi.json>

## Streaming protocol

`POST /api/chat` takes a conversation:

```json
{ "messages": [
    { "role": "user", "content": "summarize this PR" },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "more detail please" }
] }
```

The last message is the new prompt; earlier turns are the history.
The response is `text/event-stream`. Each `data:` line is one
`AgentEvent` JSON object; the stream terminates with `data: [DONE]`.

```ts
type AgentEvent =
  | { type: 'text';        delta: string }
  | { type: 'tool_use';    id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; result: unknown; isError?: boolean }
  | { type: 'error';       error: string };
```

This is the same canonical event shape used by the `web-ts` starter, so
harness snippets are portable between the two.

## Replacing the agent

1. Open `src/agent.ts` and replace everything between the
   `=== BEGIN AGENT WIRING ===` / `=== END AGENT WIRING ===` markers.
2. Keep the `streamAgent(prompt, history): AsyncGenerator<AgentEvent>`
   signature.
3. Add any new env vars to `.env.example`.
4. Register MCP servers in `src/lib/tools/mcp-config.ts`; put custom
   tools under `src/lib/tools/custom/`.

The routes, schemas, tests, and OpenAPI docs do not need to change.

## Scripts

| Script             | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | tsx watch on `src/server.ts` (Node)                     |
| `pnpm build`       | `tsc` → `dist/`                                         |
| `pnpm start`       | Run the compiled bundle: `node dist/server.js`          |
| `pnpm test`        | Vitest one-shot run                                     |
| `pnpm test:watch`  | Vitest watch mode                                       |
| `pnpm typecheck`   | `tsc --noEmit`                                          |

## Run on other runtimes

The Hono app is exported as the default from `src/index.ts`, which is
the conventional shape for every Web-standard runtime:

```ts
// src/index.ts
export default app;
```

- **Bun:** `bun run src/index.ts` (Bun auto-detects the `{ fetch }` export).
- **Cloudflare Workers:** point `wrangler.toml` `main` at `src/index.ts`.
- **Vercel (Edge or Node):** export the app from your handler file.
- **Deno Deploy:** `deno serve src/index.ts`.

Node is the only runtime that needs a thin wrapper (because it has no
built-in `fetch` server). That wrapper is `src/server.ts`.

## Docker

```bash
docker build -t agent-api .
docker run --rm -p 3000:3000 --env-file .env agent-api
```

The image is a minimal multi-stage Alpine build that demonstrates *how
to package*, not *how to deploy* — add your own logging, healthcheck
config, secret injection, and observability layer for production. If you
want reproducible deps, run `pnpm install` once locally to generate
`pnpm-lock.yaml` before building.

## Testing

`vitest` drives the app via Hono's `app.request(...)` — no port is
opened, the request is dispatched through the same `fetch` handler the
runtime would use. See `tests/chat.test.ts` for the SSE drain pattern
that asserts on the streamed `AgentEvent` shape.

## What this starter is NOT

This is deliberately a **single-developer** starter. Before you put it
in front of anyone else, add:

### Authentication (required)

There is no auth. Every request is allowed. Pick one before deployment:

```ts
// src/index.ts — bearer token (simplest, internal APIs)
import { bearerAuth } from 'hono/bearer-auth';
app.use('/api/*', bearerAuth({ token: process.env.API_TOKEN! }));

// JWT for multi-user APIs
import { jwt } from 'hono/jwt';
app.use('/api/*', jwt({ secret: process.env.JWT_SECRET! }));
```

For third-party-app authorization use full OAuth (see Hono's middleware
catalog).

### Things this starter also does NOT do

- **No persistence.** No DB, no Redis. The agent must manage state via
  its tools (MCP, harness memory, the conversation it receives in
  `messages`). Add a DB only when you have a concrete need.
- **No rate limiting.** Add `hono-rate-limiter` or your platform's
  rate-limit primitive (Cloudflare, Vercel) when you expose this.
- **No multi-tenancy.** One tenant per deploy. If you need many, plan
  the data partitioning before retrofitting.
- **No request logging.** Add `hono/logger` or wire to your platform's
  logger when needed.

## Project layout

```
src/
  agent.ts                  # PLACEHOLDER — replaced by harness snippet
  index.ts                  # Hono app + default export (portable)
  server.ts                 # Node entry — wraps app with @hono/node-server
  routes/
    chat.ts                 # POST /api/chat — SSE stream
    health.ts               # GET  /api/health
  lib/
    openapi.ts              # OpenAPI doc + Swagger UI mounting
    stream.ts               # AsyncGenerator<AgentEvent> → SSE ReadableStream
    tools/
      mcp-config.ts         # MCP server registry (empty by default)
      custom/               # Hand-written tools (empty by default)
  types.ts                  # Zod schemas + AgentEvent re-export
tests/
  chat.test.ts              # SSE happy path + validation errors
  health.test.ts            # Health endpoint shape
  openapi.test.ts           # Spec contents + Swagger UI HTML
Dockerfile                  # Multi-stage Alpine — how to package, not how to deploy
```
