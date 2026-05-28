# OpenCode

## Identity
- Repo: https://github.com/sst/opencode  (`sst/opencode` — NOT the renamed-to-Crush "Open Code" by Charm)
- Language: TypeScript (Bun runtime; some Node-compat shims)
- License: MIT
- Track: B (fork-and-strip)
- Latest pinned-for-fork SHA: `2b3ddf9f34546b9bcea25ec8e0ff57e2811c4537` (default branch `dev`, date: 2026-05-25)
- Stats: ~165K GitHub stars, package version `opencode@1.15.10`. MAU figures (~6.5M) come from third-party press and are NOT in the repo — treat as TODO: verify externally.

## What you get if you fork
A complete terminal-native coding agent built on the Vercel AI SDK, with:
- Agent loop with subagents (`primary` / `subagent` / `all` modes) and configurable per-agent permission rulesets
- 20+ AI provider adapters wired through `@ai-sdk/*` + custom providers (OpenRouter, GitLab, Venice, Poe)
- 18 built-in tools (shell, edit, glob, grep, read, write, webfetch, websearch, task, todo, lsp, plan-enter/exit, question, skill, apply_patch, repo_clone, repo_overview)
- Full MCP client (stdio + SSE + StreamableHTTP transports, OAuth flow)
- LSP integration (vscode-languageserver-types)
- Persistent multi-session via Drizzle + SQLite (`packages/effect-drizzle-sqlite`)
- Auto-compaction / overflow handling for long contexts
- Snapshot-based undo (git-backed FileDiff patches)
- Granular permission system (Effect-based, rule + wildcard patterns)
- Plugin runtime (`@opencode-ai/plugin`) for user-defined tools
- TUI built on `@opentui/core` + `@opentui/solid` (SolidJS rendering in terminal — NOT Bubble Tea/Go)
- ACP server (Agent Client Protocol) for IDE attach
- HTTP server (`opencode serve` / `opencode attach`)

The codebase is heavy: forking gives you a battle-tested base but a non-trivial strip.

## Repo structure (top-level — use this to plan vendoring)
```
opencode/
├── packages/
│   ├── opencode/         ← core CLI, agent loop, tools, providers, TUI, MCP, LSP
│   │   ├── src/
│   │   │   ├── agent/      ← Agent.Info schema, agent registry, subagent permissions
│   │   │   ├── session/    ← session/message/compaction/processor + per-model prompts
│   │   │   ├── tool/       ← built-in tools + registry + MCP wrappers
│   │   │   ├── provider/   ← provider loader, transform, model-status
│   │   │   ├── mcp/        ← MCP client (stdio/SSE/HTTP), OAuth
│   │   │   ├── lsp/        ← LSP client + launchers
│   │   │   ├── permission/ ← rule evaluation (wildcards via @opencode-ai/core)
│   │   │   ├── plugin/     ← plugin loader + built-in plugins (azure, codex, etc.)
│   │   │   ├── snapshot/   ← git-backed undo
│   │   │   ├── skill/      ← skill discovery
│   │   │   ├── acp/        ← Agent Client Protocol server
│   │   │   ├── server/     ← HTTP server for attach mode
│   │   │   ├── storage/    ← Drizzle + SQLite
│   │   │   ├── bus/        ← event bus
│   │   │   ├── cli/cmd/    ← yargs subcommands (run, serve, agent, models, mcp…)
│   │   │   └── cli/cmd/tui/← TUI app (SolidJS via @opentui/solid)
│   │   ├── bin/opencode    ← node-based bootstrap shim
│   │   └── package.json
│   ├── core/             ← @opencode-ai/core: shared util, Effect helpers, filesystem
│   ├── plugin/           ← @opencode-ai/plugin: plugin SDK types
│   ├── sdk/              ← @opencode-ai/sdk: HTTP client for attach mode
│   ├── llm/              ← @opencode-ai/llm: token / usage utilities
│   ├── ui/               ← shared UI components (used by desktop + web)
│   ├── desktop/          ← Electron app (consumes the CLI/server)
│   ├── app/ web/         ← marketing + dashboard frontends
│   ├── effect-drizzle-sqlite/ ← Effect wrapper around Drizzle/SQLite
│   └── (console, containers, enterprise, function, slack, stats, storybook, http-recorder, identity, extensions, docs, script)
├── sdks/                 ← published SDK distributions
├── infra/                ← SST/AWS infra (delete for fork)
├── patches/ migration/ specs/ script/ install/
└── LICENSE (MIT)
```

## Subsystem inventory (FOR USER SELECTION)

| Subsystem ID | Description | Source paths | Required? | Cost to strip |
|--------------|-------------|--------------|-----------|---------------|
| `agent-core` | Agent.Info schema, agent registry, agent generation, subagent permission resolution | `packages/opencode/src/agent/` | YES — required | impossible |
| `session-core` | Session/message/part tables, processor loop, system-prompt assembly | `packages/opencode/src/session/` (minus compaction, todo) | YES — required | impossible |
| `tool-runtime` | Tool.Def / Tool.Context types, registry plumbing | `packages/opencode/src/tool/tool.ts`, `registry.ts`, `truncate.ts`, `schema.ts`, `json-schema.ts` | YES — required | impossible |
| `providers-core` | Provider loader, ModelsDev catalog, transform, model-status | `packages/opencode/src/provider/` | YES — pick a subset of `@ai-sdk/*` deps | per-provider in package.json |
| `permissions` | Rule-based permission gates with wildcard matching | `packages/opencode/src/permission/` | recommended | low to strip; tools call `ctx.ask(...)` so stripping requires stubbing | 
| `tui` | SolidJS-in-terminal app via `@opentui/core` + `@opentui/solid` | `packages/opencode/src/cli/cmd/tui/` (large — app.tsx, layer.ts, footer.*, scrollback.*, stream.*, runtime.*, plus `feature-plugins/`, `plugin/`, `routes/`, `ui/`, `component/`) | optional | HIGH — many modules (e.g. `mcp/index.ts`) import `TuiEvent`; strip requires replacing those references |
| `lsp` | Language Server Protocol client, diagnostic collection | `packages/opencode/src/lsp/` + `tool/lsp.ts` | optional | low — fairly isolated |
| `mcp-client` | MCP client (stdio/SSE/StreamableHTTP) + OAuth callback server | `packages/opencode/src/mcp/` | optional | low; imports `TuiEvent` — replace with no-op bus event |
| `multi-session` | Session list, fork, replay, history, parent/child sessions | `packages/opencode/src/session/session.ts` (full) + `session.sql.ts` + `storage/` | optional | medium — sessions persist to SQLite; can run single-session in-memory by stubbing storage layer |
| `autocompact` | Auto-compaction & overflow handling for long contexts | `packages/opencode/src/session/compaction.ts`, `overflow.ts`, `summary.ts`, `agent/prompt/compaction.txt`, `agent/prompt/summary.txt` | optional | low |
| `snapshot-undo` | Git-backed snapshot + structured diff per session | `packages/opencode/src/snapshot/` | optional | low |
| `plugin-runtime` | User plugin loader + built-in plugins (azure, codex, cloudflare, digitalocean, github-copilot, xai) | `packages/opencode/src/plugin/` + workspace pkg `packages/plugin/` | optional | low |
| `skill-runtime` | Skill discovery / system-prompt injection | `packages/opencode/src/skill/` + `tool/skill.ts` | optional | low |
| `bus` | In-process event bus (used everywhere — careful) | `packages/opencode/src/bus/` | YES — required | impossible (most subsystems publish events) |
| `acp-server` | Agent Client Protocol server (for IDE editors that speak ACP) | `packages/opencode/src/acp/`, `cli/cmd/acp.ts`, `src/acp-next/` | optional | low |
| `http-server` | HTTP server for `opencode serve` + `attach` | `packages/opencode/src/server/` + `cli/cmd/serve.ts`, `cli/cmd/tui/attach.ts` | optional | medium — TUI attach mode depends on it |
| `auth` | OAuth and provider-credential storage | `packages/opencode/src/auth/` | optional if you hardcode keys via env | low |
| `share` | Share-link backend (cloud feature) | `packages/opencode/src/share/`, `control-plane/`, `account/` | optional — usually strip | low; also delete `infra/` |
| `image-pipeline` | Image input handling (photon-node, audio.d.ts) | `packages/opencode/src/image/`, `audio.d.ts` | optional | low |
| `pty` | PTY support for shell tool (`@lydell/node-pty`, `bun-pty`) | `packages/opencode/src/pty/` + `tool/shell/` | optional but `shell` tool needs it | medium |
| `desktop` | Electron app wrapping the agent | `packages/desktop/` | optional — typically strip when forking | trivial (delete package) |
| `web` / `app` / `console` / `stats` | Marketing + dashboard frontends | `packages/web/`, `packages/app/`, `packages/console/`, `packages/stats/` | optional — typically strip | trivial (delete packages) |
| `enterprise` / `slack` / `containers` / `function` / `identity` / `extensions` / `http-recorder` | SST-managed cloud surface area | corresponding `packages/*` | optional — strip for solo fork | trivial |

TODO: verify cross-references after stripping — Effect's `Layer` graph means missing services surface as runtime errors, not compile errors.

## Built-in tools (FOR USER SELECTION)

All under `packages/opencode/src/tool/`. Each tool has a `.ts` (Effect-based `Tool.Info`) and (usually) a `.txt` description used as the LLM-facing prompt.

| Tool ID | What it does | Source path |
|---------|--------------|-------------|
| `shell` (bash) | PTY-backed shell with output truncation | `tool/shell.ts` + `tool/shell/` |
| `read` | Read file with line-range + truncation | `tool/read.ts` + `read.txt` |
| `write` | Create/overwrite file with permission ask | `tool/write.ts` + `write.txt` |
| `edit` | Find-and-replace edit with uniqueness check | `tool/edit.ts` + `edit.txt` |
| `apply_patch` | Apply unified-diff patch to multiple files | `tool/apply_patch.ts` + `.txt` |
| `glob` | Glob file search (sorted by mtime) | `tool/glob.ts` + `.txt` |
| `grep` | ripgrep-backed content search | `tool/grep.ts` + `.txt` |
| `webfetch` | Fetch URL + turndown to markdown | `tool/webfetch.ts` + `.txt` |
| `websearch` | Web search (gated by provider/exa/parallel flags) | `tool/websearch.ts` + `.txt` |
| `mcp-websearch` | Variant routed via MCP | `tool/mcp-websearch.ts` |
| `task` | Delegate to a subagent | `tool/task.ts` + `.txt` |
| `todo` / `todowrite` | Todo list state for the session | `tool/todo.ts` + `todowrite.txt` |
| `plan` / `plan-enter` / `plan-exit` | Plan-mode entry/exit | `tool/plan.ts` + `plan-enter.txt` + `plan-exit.txt` |
| `question` | Ask user a structured question | `tool/question.ts` + `.txt` |
| `lsp` | LSP-backed code intelligence (hover, definition, etc.) | `tool/lsp.ts` + `.txt` |
| `repo_clone` | Clone a git repo into a managed cache | `tool/repo_clone.ts` + `.txt` |
| `repo_overview` | Generate repo overview (entry into cache) | `tool/repo_overview.ts` + `.txt` |
| `skill` | Invoke a Skill (Anthropic-style) | `tool/skill.ts` + `.txt` |
| `invalid` | Synthetic error tool injected on bad calls | `tool/invalid.ts` |

The `tool.ts` defines:
```typescript
export interface Def<Parameters extends Schema.Decoder<unknown>, M extends Metadata> {
  id: string
  description: string
  parameters: Parameters         // effect/Schema
  jsonSchema?: JSONSchema7
  execute(args, ctx: Context): Effect.Effect<ExecuteResult<M>>
  formatValidationError?(error: unknown): string
}
```
`Context` carries `sessionID`, `messageID`, `agent`, `abort: AbortSignal`, `messages`, `metadata(...)`, and `ask(...)` (for permission prompts).

## Minimum customization pattern

After forking, the agent is configured through `Agent.Info` (an Effect Schema struct) and the tool registry. Unlike Track-A SDKs, you do not instantiate an `Agent` class — you register an agent definition and the registry+session machinery drives it. A "thin" entrypoint looks like:

```typescript
// VERIFIED FROM: packages/opencode/src/agent/agent.ts (Info schema)
// + packages/opencode/src/tool/registry.ts (built-in tool list)
// After stripping, you register your agent + tools and call run via cli/cmd/run.

import { Agent } from "@/agent/agent"            // vendored from packages/opencode/src/agent
import { Permission } from "@/permission"
import { Effect } from "effect"

const MY_AGENT: Agent.Info = {
  name: "my-agent",
  description: "Custom agent forked from opencode",
  mode: "primary",
  permission: [] as unknown as Permission.Ruleset,  // start permissive; tighten later
  options: {},
  prompt: "You are a focused coding assistant. Use the available tools.",
  model: { providerID: "anthropic", modelID: "claude-opus-4-7" },
}

// Register and run via the existing CLI entrypoint:
//   bun run packages/opencode/src/index.ts run "your prompt" --agent my-agent
// or use the SDK against `opencode serve`:
//   import { createOpencodeClient } from "@opencode-ai/sdk/v2"
```

TODO: verify the exact in-process registration surface — `Agent.Service` is an Effect `Context.Service`, and most call sites go through the yargs CLI or the HTTP SDK rather than constructing agents inline. The simplest "fork it" pattern is to edit the agent prompts in `agent/prompt/*.txt` and the tool registry in `tool/registry.ts` rather than to write a new entrypoint.

## MCP support
- Built-in client supporting `stdio`, `sse`, and `streamableHttp` transports (`packages/opencode/src/mcp/index.ts`).
- OAuth flow with a local callback server (`mcp/oauth-callback.ts`, `mcp/oauth-provider.ts`).
- Configured via `opencode.json` (workspace) or global config — see `config/mcp.ts` for the schema. Example:
```json
{
  "mcp": {
    "myserver": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-server.js"]
    },
    "remote": {
      "type": "sse",
      "url": "https://example.com/mcp"
    }
  }
}
```
TODO: verify exact config shape against `packages/opencode/src/config/mcp.ts`.
- MCP tools surface as `dynamicTool` instances (from the AI SDK) merged into the tool registry alongside built-ins.

## Streaming
- Token-level streaming via the AI SDK (`ai` package — `streamText`, `streamObject`).
- Domain events (`BusEvent` in `bus/bus-event.ts`) flow through `Bus` and are consumed by TUI / HTTP server / SSE clients.
- TUI consumes `TuiEvent` (`cli/cmd/tui/event.ts`) — note that `mcp/index.ts` imports `TuiEvent` directly, so stripping the TUI requires either keeping `TuiEvent` as a stub module or replacing those imports.
- `opencode serve` exposes an SSE stream of bus events for remote attach.

## Providers (20+ first-party, 75+ via models.dev catalog)
Direct deps in `packages/opencode/package.json`:
- `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible`, `@ai-sdk/google`, `@ai-sdk/google-vertex`, `@ai-sdk/amazon-bedrock`, `@ai-sdk/azure`, `@ai-sdk/groq`, `@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/xai`, `@ai-sdk/perplexity`, `@ai-sdk/cerebras`, `@ai-sdk/deepinfra`, `@ai-sdk/togetherai`, `@ai-sdk/alibaba`, `@ai-sdk/vercel`, `@ai-sdk/gateway`, `@openrouter/ai-sdk-provider`, `gitlab-ai-provider`, `venice-ai-sdk-provider`, `ai-gateway-provider`, `opencode-poe-auth`, `@gitlab/opencode-gitlab-auth`.
- Catalog (`@opencode-ai/core/models-dev`) pulls from models.dev to expose hundreds of models.
- To strip: delete the unused `@ai-sdk/*` deps from package.json and remove their references from the provider loader. Each provider is loaded lazily — unused ones don't run, but they bloat install size.
- Built-in plugin-style provider adapters: `packages/opencode/src/plugin/{azure,cloudflare,codex,digitalocean,xai}.ts` + `github-copilot/`.

## Interface compatibility (after fork)
- **CLI**: already CLI. `opencode run "prompt"` (non-interactive), `opencode run -i` (interactive with TUI), `opencode serve` (HTTP/SSE). Keep TUI or strip — TUI is the largest single subsystem.
- **Web**: hard. The agent loop is interface-agnostic (Effect services + Bus), but the only built-in renderer is TUI. Realistic path: run `opencode serve` and build a fresh web client against `@opencode-ai/sdk/v2`.
- **Electron**: medium. `packages/desktop/` already does this — uses Electron to host the CLI + serve a web UI. You can fork `desktop/` or strip it and roll your own with pty.js around the CLI binary.
- **Slack / Discord / Telegram**: build against `@opencode-ai/sdk/v2` (HTTP) talking to `opencode serve`. `packages/slack/` is a reference Slack integration in the monorepo — inspect for patterns.
- **ACP (Agent Client Protocol)**: `opencode acp` already exposes the agent to ACP-compatible IDEs (e.g. Zed).

## Known fragile patterns
- Heavy use of Effect 3.x + custom `InstanceState` / `RuntimeFlags` / `EffectBridge` patterns; stripping a subsystem often means rewriting `Layer.merge(...)` compositions in `cli/bootstrap.ts` and per-command `effect-cmd.ts`. Compile errors are limited; missing services fail at runtime when `serviceUse(Service)` resolves.
- `mcp/index.ts` and a few other modules import `TuiEvent` from `cli/cmd/tui/event.ts` — TUI strip needs these references neutralized.
- The TUI is SolidJS-in-terminal via `@opentui/*` (NOT Bubble Tea/Go as some outside summaries claim). Its internals change frequently — `script/upgrade-opentui.ts` exists specifically to track this. Pin SHA carefully.
- Runtime is Bun-first (`bunfig.toml`, `"bun"`-conditioned imports for `#db` and `#pty`). Node compat exists (`storage/db.node.ts`, `pty/pty.node.ts`) but is secondary — picking Node-only as a target will hit edge cases.
- `infra/` + `sst.config.ts` reference SST/AWS resources for the hosted product. Delete on fork unless you want to deploy the same cloud surface.
- Drizzle migrations live in `packages/opencode/migration/` — schema changes between SHAs may require a migration when forking forward.
- Default branch is `dev`, not `main`. Lock to a specific SHA when forking.
- TODO: verify which packages in `packages/` have inter-workspace deps via `package.json` `"workspace:*"` — pruning a workspace can break installs if it's referenced.

## License attribution
- OpenCode is MIT-licensed. Vendored copies MUST include the original `LICENSE` file from the repo root and any package-level LICENSE files where present.
- Add a `NOTICE` or `THIRD_PARTY.md` recording the fork (origin URL + pinned SHA) at the root of the vendored directory.

## Common tools layer
- **Needs common-tools layer**: NO. Ships 18 built-in tools (bash, read, write, edit, glob, grep, etc.) — comprehensive coding-agent toolkit. Common-tools layer not needed.

## Tests / runner
- Runtime: Bun (`packageManager: bun@1.3.14`). Node is supported as a secondary target via conditional imports.
- Tests: `bun test --timeout 30000` (per-package `test` script in `packages/opencode/package.json`).
- Typecheck: `tsgo --noEmit` (uses `@typescript/native-preview`); root runs via `bun turbo typecheck`.
- Lint: `oxlint` at the repo root.
- HTTP API conformance: `bun run script/httpapi-exercise.ts` (run modes: `coverage`, `auth`, `effect`).
- Build: `bun run script/build.ts` (per package).
- TODO: verify CI greenness on the pinned SHA before publishing fork instructions.
