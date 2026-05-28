# OpenClaw

## Identity
- Repo: https://github.com/openclaw/openclaw  (`openclaw/openclaw`)
- Language: TypeScript (Node.js — Node 24 recommended, Node 22.19+ minimum; pnpm 11 workspace)
- License: MIT, "Copyright (c) 2026 OpenClaw Foundation"
- Track: B (fork-and-strip)
- Latest pinned-for-fork SHA: `3b023e9bdb620d940321e30169b20ec0a929db91` (default branch `main`, date: 2026-05-26)
- Stats: 374,703 GitHub stars, 78,026 forks, 1,813 subscribers (as of 2026-05-26 via `gh api repos/openclaw/openclaw`). Package version `openclaw@2026.5.26` (calendar-versioned).
- Sponsors / stewardship: README lists OpenAI, GitHub, NVIDIA, Vercel, Blacksmith, Convex as sponsors. The LICENSE copyright is held by the **OpenClaw Foundation**. The only OAuth subscription called out in README is ChatGPT/Codex via OpenAI. TODO: verify whether the Foundation publishes governance/AUP docs separate from the LICENSE — none were found in the repo root.

## What you get if you fork
A self-hostable personal-assistant gateway that:
- Speaks 21 messaging channels out of the box (WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, IRC, Microsoft Teams, Matrix, Feishu, LINE, Mattermost, Nextcloud Talk, Nostr, Synology Chat, Tlon, Twitch, Zalo, Zalo Personal, QQ — see `extensions/`). README also advertises WeChat + WebChat + Yuanbao via docs pages but no matching `extensions/` folder ships in this SHA — TODO: verify whether they ship as separate ClawHub plugins or are deferred.
- Runs a local **Gateway daemon** (default `127.0.0.1:18789`) exposing a typed WebSocket API for clients (CLI, macOS app, web admin) and **Nodes** (macOS / iOS / Android / headless companion devices).
- Bundles **voice / wake / talk** subsystems: `senseaudio` (audio I/O), `speech-core`, `azure-speech`, `deepgram`, `elevenlabs`, `tts-local-cli`, `talk-voice`, `voice-call`, plus `apps/macos-mlx-tts` for on-device TTS.
- Bundles a **Live Canvas** subsystem — agent-driven HTML/CSS/JS workspace served at `/__openclaw__/canvas/` + A2UI host at `/__openclaw__/a2ui/`.
- Ships **companion apps** under `apps/`: native macOS menu-bar app, iOS, Android, plus shared `OpenClawKit` and the `swabble` Swift package.
- 60+ LLM provider extensions (Anthropic, OpenAI, Google, Bedrock, Azure, OpenRouter, Groq, Mistral, xAI, DeepSeek, Cerebras, Together, Ollama, LMStudio, vLLM, SGLang, plus dozens of regional Chinese providers — see `extensions/`).
- Full MCP server + client (`src/mcp/`).
- A skill system (`skills/` ships 58+ bundled skills like apple-notes, github, spotify-player, weather, voice-call) plus the **ClawHub** plugin registry.
- An ACP (Agent Client Protocol) bridge (`src/acp/`).
- Sandboxing (Docker default; SSH and OpenShell backends).
- Cron, webhooks, memory backends (LanceDB, wiki, "active memory"), media generation, link/media understanding, browser tool, meeting notes.

The codebase is **large** (~18,400 files at this SHA, ~136 extensions). Forking gives you a battle-tested base but a heavy strip.

## Repo structure (top-level — use this to plan vendoring)

Note: the README phrases the architecture as Gateway / Channels / Skills / Apps. The actual monorepo layout splits core TypeScript across `src/` + `packages/` + `ui/` and treats `extensions/` as the unit of strip-or-keep. The README mention of "core/gateway/agent/cli/sdk/ui" is a conceptual grouping — the on-disk packages do not match that breakdown 1:1.

```
openclaw/
├── src/                  ← MAIN core TypeScript (NOT in packages/)
│   ├── agents/             ← agent loop, bash-tools, ACP spawn, anthropic transport
│   ├── channels/           ← channel runtime (transport, bindings, routing, plugin glue)
│   │   └── plugins/        ← channel-plugin loader, configured-binding, contracts
│   ├── gateway/            ← WebSocket daemon, control-plane, HTTP server
│   │   ├── protocol/         ← typed WS schema
│   │   ├── server/           ← HTTP + WS handlers
│   │   └── methods/          ← RPC methods (sessions, hooks, channels…)
│   ├── cli/                ← `openclaw` CLI (commander-based, ~150 subcommand files)
│   ├── mcp/                ← MCP client + MCP server bridges
│   ├── sessions/           ← session lifecycle, history, persistence
│   ├── memory/             ← in-process memory orchestration (+ memory-host-sdk re-export)
│   ├── tools/              ← tool descriptors, availability, planner, execution
│   ├── talk/ tts/          ← talk-mode + TTS orchestration
│   ├── node-host/          ← node-runner sandbox (Docker/SSH/OpenShell)
│   ├── plugins/            ← plugin loader, discovery, lifecycle
│   ├── plugin-sdk/         ← plugin SDK source (mirror; published via packages/plugin-sdk)
│   ├── acp/ flows/ cron/ daemon/ pairing/ realtime-transcription/ …
│   └── entry.ts / index.ts ← bootstrap
├── packages/             ← ONLY 4 published-style packages (NOT 6)
│   ├── sdk/                ← @openclaw/sdk — client for the Gateway WS API
│   ├── plugin-sdk/         ← @openclaw/plugin-sdk — public plugin surface
│   ├── plugin-package-contract/  ← plugin manifest schema
│   └── memory-host-sdk/    ← memory-host integration types
├── extensions/           ← 136 plugins (channels, providers, voice, canvas, search, …)
│                           Each has openclaw.plugin.json + package.json + index.ts.
├── apps/                 ← companion apps
│   ├── macos/              ← Swift macOS app (Package.swift)
│   ├── ios/                ← Xcode iOS app
│   ├── android/            ← Gradle Android app
│   ├── macos-mlx-tts/      ← Swift package: on-device MLX TTS
│   ├── shared/OpenClawKit/ ← shared Swift kit for mac+iOS
│   └── swabble/            ← Swift package
├── ui/                   ← Vite web UI (top-level workspace member, NOT in packages/)
├── skills/               ← 58+ bundled skills (apple-notes, github, spotify-player, …)
├── docs/                 ← published to docs.openclaw.ai via separate mirror repo
├── scripts/              ← build/release/migration scripts
├── test/                 ← integration suites
├── openclaw.mjs          ← CLI entrypoint (`bin/openclaw`)
├── pnpm-workspace.yaml   ← workspaces: ., ui, packages/*, extensions/*
├── Dockerfile + docker-compose.yml + fly.toml + render.yaml
└── LICENSE (MIT, OpenClaw Foundation)
```

## Subsystem inventory (FOR USER SELECTION)

Use this to decide what to keep when forking. Sources verified against the SHA above.

### Core subsystems (under `src/`)

| Subsystem ID | Description | Source paths | Required? | Cost to strip |
|--------------|-------------|--------------|-----------|---------------|
| `agents-core` | Agent loop, tool dispatch, ACP transport, Anthropic streaming, bash tooling | `src/agents/` | YES — required | impossible |
| `sessions-core` | Session lifecycle, history, transcript archive, subagent reactivation | `src/sessions/` | YES — required | impossible |
| `tools-core` | Tool descriptors, planner, availability, execution boundary | `src/tools/` | YES — required | impossible |
| `gateway-daemon` | WS server, HTTP server, RPC methods, hooks, control-UI | `src/gateway/` | YES if you want multi-client / nodes; can be bypassed for pure CLI but most channels assume it | hard — server bootstrap touches sessions, channels, plugins, auth |
| `gateway-protocol` | Typed WS schema, versions, primitives | `src/gateway/protocol/` | YES — required by SDK + Nodes | impossible |
| `channels-core` | Channel runtime, registry, bindings, plugin glue | `src/channels/` + `src/channels/plugins/` | optional if you only want CLI/MCP I/O | medium — strip means removing channel boot in gateway server |
| `cli` | `openclaw` CLI (commander, ~150 subcommands) | `src/cli/`, `openclaw.mjs` | optional — replace with your own entrypoint | medium — many subsystems wire status output through CLI |
| `mcp` | MCP client + MCP server bridges + plugin-tools server | `src/mcp/` | optional | low |
| `acp` | Agent Client Protocol surface | `src/acp/` | optional | low |
| `node-host` | Sandbox runner (Docker / SSH / OpenShell) for non-`main` sessions | `src/node-host/` | optional but recommended if exposing remotely | medium — touches exec approvals |
| `talk-runtime` | Talk-mode orchestration, agent-consult handoff, realtime transcript relay | `src/talk/`, `src/realtime-transcription/`, `src/gateway/talk-*.ts` | optional | medium — gateway server has talk-runtime imports |
| `tts-orchestration` | TTS pipeline glue | `src/tts/` | optional | low |
| `memory-orchestration` | Memory selection, recall, write-paths | `src/memory/` + `src/memory-host-sdk/` | optional | medium — agents call memory hooks |
| `media-generation` | Image / music / video generation routing | `src/image-generation/`, `src/music-generation/`, `src/media-generation/`, `src/media/` | optional | low |
| `media-understanding` | Image / link / document understanding | `src/media-understanding/`, `src/link-understanding/` | optional | low |
| `meeting-notes` | Meeting-notes capture / summarization | `src/meeting-notes/` | optional | low |
| `cron` | Cron scheduler for agent tasks | `src/cron/` | optional | low |
| `daemon` | Daemon mgmt (launchd / systemd user services) | `src/daemon/` | optional — needed for `--install-daemon` | low |
| `pairing` | Device & DM pairing flow | `src/pairing/` | required if you keep channels — DM allowlist enforcement lives here | medium |
| `auto-reply` / `commitments` / `flows` / `crestodian` | Higher-level assistant behaviors | `src/auto-reply/`, `src/commitments/`, `src/flows/`, `src/crestodian/` | optional | low |
| `context-engine` | Context-window curation | `src/context-engine/` | optional | medium — agent loop reads from here |
| `provider-runtime` | Provider-side runtime (auth profiles, fallback, rotation) | `src/provider-runtime/` | YES — required to call any LLM | impossible |
| `model-catalog` | Model catalog + capability registry | `src/model-catalog/` | YES — required by provider routing | impossible |
| `proxy-capture` | Outbound HTTP capture for diagnostics | `src/proxy-capture/` | optional | low |
| `security` | Security policy primitives | `src/security/` | recommended | low |
| `i18n` | Translations | `src/i18n/` | optional | trivial |

### Plugin subsystems (under `extensions/`, 136 total)

Each `extensions/<id>/` is a self-contained pnpm workspace with `openclaw.plugin.json` + `package.json` + an `index.ts`. Strip == delete the folder + remove the workspace glob match (already covered by `extensions/*`).

| Group | Members | Count | Cost to strip |
|-------|---------|-------|---------------|
| **Channels (messaging)** | `whatsapp`, `telegram`, `slack`, `discord`, `googlechat`, `signal`, `imessage`, `irc`, `msteams`, `matrix`, `feishu`, `line`, `mattermost`, `nextcloud-talk`, `nostr`, `synology-chat`, `tlon`, `twitch`, `zalo`, `zalouser`, `qqbot` | 21 | trivial each |
| **LLM providers** | `anthropic`, `anthropic-vertex`, `openai`, `google`, `amazon-bedrock`, `amazon-bedrock-mantle`, `azure-speech`, `groq`, `mistral`, `xai`, `perplexity`, `cerebras`, `deepinfra`, `deepseek`, `together`, `alibaba`, `cloudflare-ai-gateway`, `vercel-ai-gateway`, `openrouter`, `litellm`, `ollama`, `lmstudio`, `vllm`, `sglang`, `huggingface`, `nvidia`, `microsoft`, `microsoft-foundry`, `arcee`, `byteplus`, `chutes`, `comfy`, `copilot-proxy`, `fireworks`, `gradium`, `inworld`, `kilocode`, `kimi-coding`, `minimax`, `moonshot`, `qianfan`, `qwen`, `runway`, `stepfun`, `synthetic`, `tencent`, `tokenjuice`, `venice`, `volcengine`, `voyage`, `zai`, `fal`, `github-copilot`, `opencode`, `opencode-go`, `open-prose` | ~57 | trivial each (lazy-loaded) |
| **Voice / audio** | `azure-speech`, `deepgram`, `elevenlabs`, `senseaudio`, `speech-core`, `talk-voice`, `tts-local-cli`, `voice-call`, `inworld` | 9 | trivial each; safe to drop together |
| **Canvas** | `canvas` (uses `@a2ui/lit` + `lit`) | 1 | trivial |
| **Web search** | `brave`, `duckduckgo`, `exa`, `firecrawl`, `searxng`, `tavily`, `web-readability` | 7 | trivial |
| **Memory backends** | `active-memory`, `memory-core`, `memory-lancedb`, `memory-wiki` | 4 | medium — `memory-core` is used by orchestration glue |
| **Diagnostics** | `diagnostics-otel`, `diagnostics-prometheus`, `diffs` | 3 | trivial |
| **Browser / tools** | `browser`, `phone-control`, `device-pair`, `bonjour`, `file-transfer`, `webhooks`, `gh-issues` (skill not ext) | mixed | trivial each |
| **Other channels-adjacent** | `acpx`, `admin-http-rpc`, `clickclack`, `oc-path`, `openshell`, `policy`, `skill-workshop`, `thread-ownership` | many | varies |
| **QA / test infra** | `qa-channel`, `qa-lab`, `qa-matrix`, `test-support` | 4 | trivial |
| **Lobster fun** | `lobster`, `migrate-claude`, `migrate-hermes`, `xiaomi`, `gemini`, `vydra` | 6 | trivial |

TODO: verify the exact `extensions/` count by cross-walking `pnpm-workspace.yaml` against the directory list — 136 entries observed.

### Companion apps (`apps/`)

| App | Path | Required? | Cost to strip |
|-----|------|-----------|---------------|
| `apps/macos` | Swift menubar app | optional | trivial — entire directory deletes cleanly |
| `apps/ios` | Xcode iOS app | optional | trivial |
| `apps/android` | Gradle Android app | optional | trivial |
| `apps/macos-mlx-tts` | Swift package for on-device MLX TTS | optional | trivial; if kept, the `tts-orchestration` glue must continue to spawn it |
| `apps/shared/OpenClawKit` | Shared Swift kit | optional | required only if you keep macOS or iOS |
| `apps/swabble` | Swift package | optional | trivial |

### UI + skills

| Subsystem | Path | Cost to strip |
|-----------|------|---------------|
| Web UI | `ui/` (Vite + workspace member) | trivial — drop the workspace entry |
| Bundled skills | `skills/*` (58+ folders) | trivial each; the skill loader survives an empty set |

## Built-in tools (FOR USER SELECTION)

Tool catalog is plugin-extensible. The sandbox default in README (`docs/concepts/architecture.md` cross-ref) names the canonical core tool set; the catalog plumbing lives in `src/tools/`. Verified tool names appearing in source:

| Tool ID | What it does | Likely source |
|---------|--------------|---------------|
| `bash` | Host shell (PTY-backed, exec-approval gated) | `src/agents/bash-tools*.ts`, `src/agents/bash-process-registry.ts` |
| `process` | Long-running background process control | `src/agents/bash-tools.process*.ts` |
| `read` | Read file with truncation | core (TODO: verify exact file) |
| `write` | Create/overwrite file | core |
| `edit` | Find-and-replace edit | core |
| `apply_patch` | Unified-diff patch | `src/agents/apply-patch*.ts` |
| `sessions_list` / `sessions_history` / `sessions_send` / `sessions_spawn` | Session management surface for the agent | `src/sessions/` + `src/gateway/server-methods/` |
| `browser` | Browser tool (default denied in non-`main` sandbox) | `extensions/browser/` |
| `canvas` | Canvas / A2UI tool (denied in non-`main` sandbox) | `extensions/canvas/` |
| `nodes` | Invoke a connected node (camera, screen, location) | `src/node-host/`, `extensions/` |
| `cron` | Schedule recurring tasks | `src/cron/` + `extensions/` |
| `discord` / `slack` actions | Channel-specific action tools | `src/channels/plugins/actions/` + per-extension actions |
| `webfetch` / `websearch` | Built into search extensions | `extensions/{brave,duckduckgo,exa,firecrawl,searxng,tavily,web-readability}` |
| `memory.*` | Memory ops | `src/memory/` + `extensions/memory-*` |
| `cron` / `webhooks` | Automation | `src/cron/`, `extensions/webhooks/` |
| `voice-call` | Voice call tool | `extensions/voice-call/` |
| `meeting-notes` | Meeting capture | `extensions/meeting-notes/` |
| `gateway` | Gateway-control RPCs | (denied in sandbox) |

Tools are typed via `ToolDescriptor` in `src/tools/types.ts`:

```typescript
// VERIFIED FROM: src/tools/types.ts
export type ToolDescriptor = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonObject;
  readonly outputSchema?: JsonObject;
  readonly owner: ToolOwnerRef;       // core | plugin | channel | mcp
  readonly executor?: ToolExecutorRef;
  readonly availability?: ToolAvailabilityExpression;  // auth/config/env/plugin-enabled gates
  readonly annotations?: JsonObject;
  readonly sortKey?: string;
};
```

TODO: verify the canonical "shipped tool list" — there is no single `tool/registry.ts` file like OpenCode. Tools are aggregated dynamically across core (`src/tools/` + `src/agents/`), channels (`src/channels/plugins/actions/`), plugins (`extensions/*`), and MCP. Use `src/gateway/server-methods/` + `src/tools/availability.ts` to discover the live catalog at runtime.

## Minimum customization pattern

OpenClaw is a **gateway daemon + SDK** product, not an in-process agent class. The realistic fork pattern is to **trim, not embed** — keep the daemon, strip unwanted channels/providers/voice/canvas/apps, and either drive it from the bundled CLI or from `@openclaw/sdk` over WebSocket.

```typescript
// VERIFIED FROM: packages/sdk/src/index.ts
import {
  OpenClaw,
  type OpenClawOptions,
} from "@openclaw/sdk";

const client = new OpenClaw({
  baseUrl: "ws://127.0.0.1:18789",
  token: process.env.OPENCLAW_TOKEN,        // gateway token, see `openclaw doctor`
});

const run = await client.runs.create({
  agent: "main",
  input: "What's on my calendar tomorrow?",
  // SDK also exposes: agents, approvals, artifacts, environments,
  // models, runs, sessions, tasks, tools namespaces.
});

for await (const event of client.events.subscribe()) {
  // GatewayEvent: agent/chat/presence/health/heartbeat/cron
  console.log(event);
}
```

To strip down a fork for, e.g., a **Telegram-only research agent**:

1. Delete every `extensions/<id>/` folder except `extensions/telegram/` + one LLM provider you want (e.g. `extensions/anthropic/`) + any tool extensions you need (`extensions/brave/`, `extensions/web-readability/`).
2. Delete `apps/` entirely (macOS / iOS / Android / swabble / macos-mlx-tts / shared).
3. Delete `ui/` and remove it from `pnpm-workspace.yaml`.
4. Drop voice + canvas + memory backends from `extensions/` if not needed.
5. In `src/`, you generally cannot trim further without breaking the gateway — leave `src/*` intact.
6. Trim `skills/` to the ones you want.
7. Run `pnpm install` and `pnpm test` to confirm graphs still resolve.

TODO: verify whether stripping `extensions/canvas` causes `src/gateway/control-ui*` or `/__openclaw__/canvas/` route handlers to fail at boot — README implies the canvas host is **served by the Gateway**, suggesting tight coupling.

## MCP support

- **Client + server**: `src/mcp/` ships an MCP server (stdio + HTTP channel), a tool-bridge that serves OpenClaw's own tools to MCP clients, and plugin-side MCP tools.
- Transport options visible in source: stdio (`tools-stdio-server.ts`), channel server (`channel-server.ts`), HTTP (`src/gateway/mcp-http.*`).
- MCP servers are configured via gateway config / plugin manifests; tools loaded over MCP register as `ToolOwnerRef { kind: "mcp", serverId }` in the tool descriptor system.

TODO: verify the exact configuration schema for `mcp.servers` in `openclaw doctor` / config files — look at `src/config/` + `docs/automation/`.

## Streaming
- **Primary transport is WebSocket** (not SSE). All clients (CLI, macOS app, web UI, Nodes) connect over WS to the Gateway on `127.0.0.1:18789` by default.
- Gateway emits typed events: `agent`, `chat`, `presence`, `health`, `heartbeat`, `cron`, `shutdown`.
- `@openclaw/sdk` exposes `EventHub` + `isGatewayEvent` + `normalizeGatewayEvent` for consumers.
- LLM token streaming flows in over provider transports (`src/agents/anthropic-transport-stream.ts`, etc.) and surfaces to clients as `chat` / `agent` events on the WS.
- HTTP endpoints (`src/gateway/server-http.ts` + `mcp-http.ts` + `models-http.ts` + `openai-http.ts`) exist alongside WS — OpenClaw can also speak the OpenAI-compatible HTTP surface for non-WS clients.

## Providers
~57 first-party provider adapters under `extensions/*`. Provider routing, fallback, auth profile rotation, and cooldown live in `src/provider-runtime/` + `src/agents/auth-profiles*.ts`. Auth-profile system supports OAuth subscriptions (ChatGPT/Codex called out in README), API keys, and rotation with cooldown-aware ordering.

- Stripping: delete the unused `extensions/<provider>` folder. Each provider is workspace-scoped and lazy-loaded — pruning has no compile-time blast radius but does change the model catalog.
- The `litellm`, `openai`, and `anthropic` adapters are the most general; pick at least one to keep.
- `opencode` and `opencode-go` extensions exist (sibling product compat).

## Interface compatibility (after fork)
- **CLI**: already CLI. `openclaw onboard`, `openclaw gateway`, `openclaw agent --message "…"`, `openclaw message send`, `openclaw pairing approve`, plus ~150 other subcommands under `src/cli/`.
- **Daemon + remote**: `openclaw gateway --port 18789 --verbose`. Designed to be exposed over Tailscale / SSH tunnel — read `docs/gateway/security/exposure-runbook` before exposing publicly.
- **Web**: `ui/` is a Vite app that talks to the gateway WS. `apps/macos` also hosts a web shell.
- **Native (Swift/Kotlin)**: `apps/{macos,ios,android}` are full native apps that join the gateway as **Nodes** over WS (`role: "node"`).
- **Slack / Discord / Telegram / WhatsApp / etc.**: built-in via `extensions/<channel>`. Pairing-based DM access by default (`dmPolicy="pairing"`).
- **MCP**: serve OpenClaw tools to any MCP client via `src/mcp/openclaw-tools-serve.ts`.
- **ACP**: `src/acp/` lets ACP-compatible IDEs attach. ACP-related `extensions/acpx/` ships separately.

## Known fragile patterns
- **Runtime is Node 22.19+ (24 recommended)** with **pnpm 11** — *not* Bun. No `bunfig.toml`, no `#bun` conditional imports. This is a positive differentiator vs OpenCode for environments where Bun is undesirable.
- **`pnpm-workspace.yaml` is dense**: 80+ entries in `minimumReleaseAgeExclude`, a strict `overrides` block, a curated `allowBuilds` allowlist (e.g. `baileys: true`, `node-llama-cpp: true`, `@discordjs/opus: false`, `tree-sitter-bash: false`), and `nodeLinker: hoisted` + `blockExoticSubdeps: true`. Forks that prune this carelessly will hit native-build / lockfile failures.
- **Plugin boundary is enforced**: root `AGENTS.md` states plugins MUST NOT import from `src/**`, other plugins' `src/**`, or `src/plugin-sdk-internal/**`. The only legal crossing is via `@openclaw/plugin-sdk` + `openclaw.plugin.json` manifests + documented barrels (`api.ts`, `runtime-api.ts`). Violating this breaks ClawSweeper review checks.
- **Gateway is the single chokepoint**: only one Gateway per host, and it is the only process that opens WhatsApp / iMessage / Signal sessions. Two Gateways with the same config will fight over channels.
- **Default DM policy is `"pairing"`** — unknown senders get a pairing code, *not* a response. Forks that aim for public deployments must set `dmPolicy="open"` *and* configure `allowFrom` allowlists; the README's security defaults document the exact knobs.
- **Sandbox defaults**: in non-`main` sessions, `browser`, `canvas`, `nodes`, `cron`, `discord`, `gateway` tools are denied by default. Stripping these tools entirely will not affect `main` but changes the agent's surface area for group chats.
- **Canvas host is served by Gateway HTTP server**: stripping `extensions/canvas` removes the plugin but the gateway control-UI may still expose `/__openclaw__/canvas/` route stubs — TODO: verify.
- **Companion apps depend on Gateway, not the reverse**: deleting `apps/*` is safe. Deleting `src/gateway/` breaks the apps.
- **`apps/macos-mlx-tts` is a Swift package**: if kept, the `tts-orchestration` glue must continue to find its binary. Strip pairs `apps/macos-mlx-tts` ↔ `extensions/tts-local-cli`.
- **Memory has multiple back-ends** (`memory-lancedb`, `memory-wiki`, `active-memory`, `memory-core`, in-process). `memory-core` is referenced by orchestration glue — strip it last.
- **Calendar versioning**: package version is `2026.5.26` (year.month.day), matching the date of the SHA. Peer-dep ranges like `openclaw: ">=2026.5.26"` in extensions mean version pins shift daily — pin to the SHA, not the version.
- **Tests are vitest**: `vitest.config.ts` at root, per-package `vitest.config.ts` in `ui/`. Many `.live.test.ts` suites hit real provider APIs — `pnpm test` may attempt network. Use `pnpm test --exclude '**/*.live.test.ts'` for offline CI.
- **`@anthropic-ai/sdk` is pinned to 0.98.0** via root overrides — DO NOT bump without checking transport stream tests.
- WeChat / WebChat / Yuanbao have docs pages but no shipped `extensions/` folders in this SHA — TODO: verify whether they live in a separate ClawHub plugin repo.

## License attribution
- MIT, "Copyright (c) 2026 OpenClaw Foundation" (verbatim from `LICENSE`).
- Vendored copies MUST include the original root `LICENSE` and any per-package LICENSE files (`apps/swabble/LICENSE` exists; others TODO: verify).
- Recommended: add a `NOTICE` or `THIRD_PARTY.md` recording the fork (origin URL + pinned SHA + date) at the root of the vendored directory.
- CONTRIBUTING.md establishes the maintainer roster and a **"Benevolent Dictator"** model under Peter Steinberger; it does NOT introduce additional license terms or an acceptable-use clause. No CLA was observed.
- TODO: verify whether sponsor logos (OpenAI / NVIDIA / GitHub / Vercel) carry trademark restrictions that affect re-distribution of `docs/assets/sponsors/`.

## Common tools layer
- **Needs common-tools layer**: NO. The bundled tool set is broad (`bash`, `process`, `read`, `write`, `edit`, `apply_patch`, `sessions_*`, `browser`, `canvas`, `nodes`, `cron`, `memory.*`, channel actions, `webfetch`/`websearch` via plugins). Forks should pick the subset they want and disable the rest via plugin manifests + sandbox policy, not vendor a separate common-tools layer.

## Tests / runner
- Runtime: Node 22.19+ (24 recommended). Package manager: pnpm 11.2.2 (sha-pinned in root `packageManager`).
- Tests: **vitest** at root (`vitest.config.ts`) and in `ui/` (`vitest.config.ts` + `vitest.node.config.ts`).
- E2E suites under `test/` and `*.e2e.test.ts` files across `src/`.
- Live API suites: any file matching `*.live.test.ts` hits real provider endpoints; gate via env vars in CI.
- Build: `tsdown` (`tsdown.config.ts` at root); per-extension builds via the same tool.
- Lint: `oxlint` (`.oxlintrc.json` at root).
- Formatter: `oxfmt` (`.oxfmtrc.jsonc`).
- Pre-commit: `.pre-commit-config.yaml` wires the lint/format/typecheck chain.
- Container: `Dockerfile` + `docker-compose.yml` + `fly.toml` + `render.yaml` ship for self-host scenarios.
- TODO: verify CI greenness for SHA `3b023e9bdb620d940321e30169b20ec0a929db91` before publishing fork instructions — the SHA is the literal head of `main` at 2026-05-26T06:50:39Z.
