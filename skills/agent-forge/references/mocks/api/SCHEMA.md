# Mock Contract — `api` interface

This document defines what an `api`-interface mock MUST include during Stage 5.5
(mock-iterate). The mock for an API agent is **not a screenshot** — it is an
**OpenAPI 3.1 specification**. The "states" you would draw for a web/electron
interface map here to **operations and response variants** (200 happy path, 4xx
client errors, 5xx server errors, streaming event union).

The spec is what the user reviews and iterates on. Once approved, the same
`openapi.yaml` becomes the **production contract** that ships in the produced
project's root — not just in `mocks/`.

## Required artifacts

```
mocks/api/
  SCHEMA.md            ← this file
  starter/
    openapi.yaml       ← OpenAPI 3.1 spec (the contract)
    swagger.html       ← Swagger UI viewer (CDN-hosted assets)
    README.md          ← how to view and iterate
```

## Required operations

| Method | Path | Operation | Notes |
|--------|------|-----------|-------|
| `POST` | `/agent/stream` | `streamAgent` | SSE; `text/event-stream` response |
| `POST` | `/agent/invoke` | `invokeAgent` | Non-streaming; for batch / cron callers |
| `GET`  | `/agent/sessions/{sessionId}` | `getSession` | Returns full session + history (persistence required) |
| `POST` | `/agent/sessions/{sessionId}/messages` | `appendMessage` | Appends a user message to a session |
| `DELETE` | `/agent/sessions/{sessionId}` | `clearSession` | Wipes a session |
| `GET`  | `/health` | `getHealth` | Liveness probe — no auth |

Sessions endpoints are **conditional on persistence**: if Stage 5 chose
`persistence: none`, the skill removes them from the produced contract.

## SSE event union (`/agent/stream`)

OpenAPI 3.1 has no first-class SSE description. The contract documents the
streaming response as `text/event-stream` and supplies a `oneOf` example schema
named `AgentEvent` so the human reviewer (and downstream tooling) sees the
discriminated union. Each SSE `data:` line is one JSON event; the stream
terminates with the literal sentinel `data: [DONE]\n\n` for OpenAI-SSE
compatibility.

| `type` discriminator | Payload | When |
|----------------------|---------|------|
| `token` | `{ delta: string }` | Streaming chunk of assistant text |
| `tool_call` | `{ id, name, args }` | Agent invoked a tool |
| `tool_result` | `{ id, result, isError? }` | Tool returned |
| `error` | `{ code, message, retryAfterMs? }` | Recoverable or terminal error |
| `end` | `{ reason: "complete" \| "stopped" \| "error" }` | Final typed event; followed by `[DONE]` |

## Required component schemas

- `Message` — `{ role: "user" \| "assistant" \| "tool" \| "system", content, toolCalls?, citations? }`
- `Session` — `{ id, createdAt, updatedAt, messages: Message[] }`
- `ToolCall` — `{ id, name, args, result?, status: "pending" \| "running" \| "complete" \| "error" }`
- `Citation` — `{ id, sourceUrl, snippet }` (only emitted if Stage 4 added a research/citations tool)
- `Error` — `{ code, message, retryAfterMs? }` — matches Stage 5 UX policy error shape
- `AgentEvent` — `oneOf` of the event types above, discriminated by `type`

## Authentication

Mock starter uses `bearerAuth` (HTTP scheme `bearer`) by default. The
`securitySchemes` block also stubs `apiKeyAuth` (header `X-API-Key`) — the skill
selects one based on the user's Stage 5 answer. Health remains unauthenticated.

The starter spec is annotated:

```yaml
# AUTH NOTE: Default is bearer-token. Swap to apiKeyAuth or extend with OAuth2
# when ready. See README. The api-ts starter ships NO auth middleware — the
# user must add `hono/bearer-auth` (or equivalent) post-generation.
```

## Error responses per status

Reusable under `components.responses`:

| Status | Reusable name | When |
|--------|---------------|------|
| 400 | `BadRequest` | Malformed body / empty conversation |
| 401 | `Unauthorized` | Missing or invalid bearer token |
| 403 | `Forbidden` | Token valid but action not permitted |
| 404 | `NotFound` | Session not found |
| 429 | `RateLimited` | Includes `Retry-After` response header (seconds) |
| 500 | `InternalError` | Unhandled server error |
| 503 | `ServiceUnavailable` | Upstream model provider failure (retry candidate) |

All four use the same `Error` schema body.

## Swagger UI viewer

`swagger.html` loads Swagger UI from a CDN
(`https://unpkg.com/swagger-ui-dist@5/`), points it at `./openapi.yaml`, and:

- Disables try-it-out via `supportedSubmitMethods: []` (no backend exists)
- Sets `docExpansion: "list"` so every path is visible without clicking
- Renders a header bar with `{AGENT_NAME}` and a "Mock — design contract" banner

## Self-contained

```
cd mocks/api/starter && npx serve
# open http://localhost:3000/swagger.html
```

No build step, no install. Works offline once the CDN assets are cached.

## How the skill customizes the starter

Stage 5.5 runs these substitutions before showing the mock to the user:

| Placeholder | Replaced with |
|-------------|---------------|
| `{AGENT_NAME}` | `state.agent.name` |
| `{AGENT_ONE_LINER}` | `state.agent.description` |
| Tool-name examples in SSE event payloads | First 3 tool names from `state.tools` (or keep `bash`, `file_read`, `web_search` defaults if generic) |
| `bearerAuth` block | Swapped for `apiKeyAuth` if Stage 5 chose API key, kept if bearer, removed entirely if `none` |
| Sessions block | Removed if `state.ux.persistence === "none"` |

## Lifecycle in the produced project

After approval, Stage 6 generates the project. For API:

1. The starter at `references/interface-starters/api-ts/` is copied to the
   project directory.
2. **`openapi.yaml` is copied to the project root** (not `mocks/`) — it is the
   production contract.
3. `swagger.html` stays under the project's `mocks/` directory as the
   human-readable design view (for design diffs in future iterations).
4. The Hono routes in the api-ts starter are aligned to the contract:
   - Route paths match the spec's paths
   - Each `createRoute` block has the spec's `operationId`
   - Zod schemas in `src/types.ts` mirror the component schemas
5. A test in the produced project asserts the live `/openapi.json` (generated
   by `@hono/zod-openapi`) is structurally compatible with the shipped
   `openapi.yaml`.

## Out of scope for the mock

- Actual handler implementations
- Runtime behavior (latency, throughput, retry policies — those are Stage 5 UX
  decisions wired in Stage 6)
- Response examples beyond the happy path and one error per status
- Auth middleware code
- Rate-limit middleware code
