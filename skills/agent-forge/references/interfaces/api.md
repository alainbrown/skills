# Interface: API (Hono)

The API interface is for agents that don't have a UI of their own — they're consumed by other apps (B2B SaaS embeds, frontends the user already owns, automation triggered by webhooks, image/asset generation services).

## What "API" means here

A Hono-based HTTP server with:
- **POST /api/chat** — streaming agent invocation via Server-Sent Events
- **GET /api/health** — health check
- **GET /openapi.json** — auto-generated OpenAPI 3.1 spec
- **GET /docs** — Swagger UI for the API

Hono is the right choice because it runs on **Bun, Node, Cloudflare Workers, Vercel, and Deno** from a single codebase — the user picks the runtime at deployment time without changing the agent code.

## What's NOT in the API starter

By design (per the skill's stated scope of "single-developer working starter"):

| Not included | Why | What the user does instead |
|--------------|-----|----------------------------|
| Auth (bearer / JWT / OAuth) | Out of scope — too many options, wrong default | README points at Hono's `hono/jwt`, `hono/bearer-auth` middleware to add when ready |
| Database / persistence | Agents manage state via tools or harness memory | The harness's memory primitive (e.g., Mastra LibSQL) handles conversation; app state goes in tools |
| Rate limiting | Deployment-environment concern | Cloudflare Workers / Vercel / Fly.io have rate limit primitives at the platform layer |
| Multi-tenancy | Different problem from "build an agent" | Add a per-tenant config + auth layer when you scale |

This keeps the starter scope coherent with what the skill's stated for other interfaces.

## Streaming protocol

The chat endpoint returns `text/event-stream`. Each `AgentEvent` is one SSE message:

```
data: {"type":"text","delta":"Hello"}

data: {"type":"text","delta":", world"}

data: {"type":"tool_use","id":"...","name":"file_read","input":{"path":"./README.md"}}

data: {"type":"tool_result","id":"...","result":"# Hello..."}

data: [DONE]
```

The `data: [DONE]` terminator is the convention from OpenAI's API for compatibility — clients that already handle OpenAI-style SSE work without changes.

## Multi-runtime story

The same `src/index.ts` runs on:

| Runtime | How |
|---------|-----|
| **Node** | `@hono/node-server`'s `serve(app)` wrapper |
| **Bun** | `Bun.serve({ fetch: app.fetch })` |
| **Cloudflare Workers** | `export default app` — works as-is |
| **Vercel** | `export default app` — works as-is |
| **Deno** | `Deno.serve(app.fetch)` |

The starter's `package.json` ships the Node setup (`@hono/node-server`); the README documents the others as one-line swaps.

## Required env vars

Just the harness's provider key (e.g., `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`). MCP server keys if used. No DB URLs, no auth secrets, no Redis — those come in when the user adds them post-skill.

## Build for production

- `pnpm build` → emits to `dist/`
- `node dist/index.js` → runs the server
- `docker build -t my-agent-api .` → packages as an image

The Dockerfile is multi-stage Alpine — small image, no dev deps in the runtime layer.

## What to add before shipping to others

The README of the produced project should be explicit:

> ⚠ Before deploying this API to others, add authentication.
>
> This starter is single-developer scope — anyone with the API URL can invoke your agent and rack up your provider bill. Common patterns when you're ready:
> - **Bearer token via env** — simplest, for internal/team APIs. Add `hono/bearer-auth` middleware.
> - **JWT** — for multi-user APIs. Use `hono/jwt`.
> - **OAuth** — for third-party-app APIs. Hono has community middleware for major providers.

The skill does NOT ship any of these stubs — they're opinionated choices the user should make consciously.

## Testing

- Hono has first-class testing via `app.request(path, options)` — same request handling without spinning up a server
- SSE tests assert the stream emits expected events in order
- `pnpm test` runs the full suite

## Tradeoffs vs other interfaces

| Aspect | CLI | Web | Electron | **API** |
|--------|-----|-----|----------|---------|
| Deployment target | dev machine | a web host | desktop app | any HTTP runtime |
| User-facing? | dev only | end users (browser) | end users (desktop) | NO — consumed by other code |
| Auth required? | no (local) | usually yes | local-only OK | YES (to deploy) |
| Per-request cost model | local | session | session | per-request |
| Best when... | personal dev tool | end-user product | desktop product | embedding in another product / B2B |
