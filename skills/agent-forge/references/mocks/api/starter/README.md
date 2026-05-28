# API Mock — {AGENT_NAME}

This directory holds the OpenAPI 3.1 design contract for the API interface and a
Swagger UI viewer to read it. There is no backend — the mock is the spec.

## View

```sh
cd mocks/api/starter
npx serve
# open http://localhost:3000/swagger.html
```

`serve` is one of many static-file servers; any will do. The viewer loads
`openapi.yaml` over a relative URL.

## Iterate

1. Edit `openapi.yaml` in your editor.
2. Refresh the browser tab.
3. Repeat until the contract reflects what you want the API to look like.

There is no try-it-out. Swagger UI is configured with `supportedSubmitMethods:
[]` because no server exists yet. You are reviewing shape, not behavior.

## Review focus

When walking through the spec with the user, focus on:

- **Response shapes.** Do `Message`, `Session`, `ToolCall`, and `Error` match
  what the agent will actually emit? Are there fields the agent needs that are
  missing (e.g. usage tokens, latency, model name)?
- **SSE event union.** Are `token`, `tool_call`, `tool_result`, and `end` the
  right granularity? Does the agent need additional event types (e.g.
  `thinking`, `progress`, `subagent_handoff`)?
- **Auth scheme.** `bearerAuth` is the default. Swap to `apiKeyAuth` or remove
  auth entirely depending on the deployment story.
- **Sessions endpoints.** Keep them only if Stage 5 chose to persist
  conversations. Otherwise delete the `Sessions` paths and the `Session` schema.
- **Error responses.** Are the status codes and `Error.code` values what the
  client will branch on? Is `retryAfterMs` redundant given the `Retry-After`
  header?

## After approval

Stage 6 generates the project. `openapi.yaml` is **copied to the produced
project root** as the production contract. The Hono routes in the api-ts
starter are aligned to its paths and operationIds; `src/types.ts` Zod schemas
mirror the component schemas. The generated project includes a test that
verifies the live `/openapi.json` (emitted by `@hono/zod-openapi`) is
structurally compatible with this YAML.

`swagger.html` stays under the project's `mocks/` directory as a human-readable
design view for future contract diffs.
