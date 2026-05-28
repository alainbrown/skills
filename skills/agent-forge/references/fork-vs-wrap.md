# Fork vs Wrap Patterns

Two distinct generation patterns. Each subagent in Stage 6 picks one based on `state.harness.track`.

## Track A — Wrap (library import)

The framework lives in `node_modules`. The user's project is small and mostly app code.

### Produced project shape (TS, e.g. mastra)

```
<agent-name>/
├── package.json              ← lists "@mastra/core", interface deps, tool MCPs
├── pnpm-lock.yaml
├── .env.example              ← ANTHROPIC_API_KEY (or other provider), MCP server keys
├── src/
│   ├── agent.ts              ← imports SDK, configures with system prompt + tools + UX policy
│   ├── tools/
│   │   ├── mcp-config.ts     ← MCP server registrations
│   │   └── custom/           ← bespoke tools (if any)
│   ├── interface/
│   │   ├── cli.ts            ← reads stdin, streams to stdout
│   │   ├── web/              ← Next.js (only if web interface picked)
│   │   ├── electron/         ← main + renderer (only if electron picked)
│   │   └── api/              ← Hono routes (only if api interface picked)
│   └── prompt.ts             ← system prompt as a const
├── tests/
│   ├── tools/                ← exhaustive tool tests
│   └── smoke.test.ts         ← agent + happy path
└── README.md
```

### Wiring rules

- **System prompt** lives in its own file (`src/prompt.ts`), exported as a const. The agent code
  imports it. Makes it easy to revise without touching agent wiring.
- **Tools** are split: MCP server configs in `tools/mcp-config.ts`, bespoke tools each in their
  own file under `tools/custom/`. The agent imports an aggregator.
- **Interface** is thin — reads input, calls `agent.stream()` (or framework equivalent), renders
  output. NEVER mix interface logic with agent logic.
- **UX policy** is applied at agent construction time. Errors are caught at the boundary; the
  policy from `state.ux.errorPolicy` decides whether to fail-fast or log-continue per category.

## Track B — Fork (vendor and strip)

The forked harness's source code is copied into the user's project. The user owns it from that
moment on. Only the kept subsystems are vendored.

### Produced project shape (OpenCode fork example)

```
<agent-name>/
├── package.json              ← inherits OpenCode's deps minus stripped subsystems
├── pnpm-lock.yaml
├── .env.example
├── vendor/                   ← VENDORED FROM OPENCODE
│   ├── core/                 ← agent loop, retained
│   ├── tools/                ← only kept tools (per state.harness.forkSubsystems.kept)
│   │   ├── file.ts
│   │   ├── bash.ts
│   │   └── ...
│   ├── mcp-client/           ← if MCP capability kept
│   └── streaming/            ← retained
├── src/                      ← USER'S CUSTOMIZATIONS
│   ├── agent.ts              ← thin re-export of vendor with customizations
│   ├── tools/
│   │   └── custom/           ← bespoke tools added on top
│   ├── interface/            ← overrides or extends vendor's interface
│   └── prompt.ts             ← user's system prompt overrides vendor's default
├── tests/
│   ├── tools/                ← tests for kept + custom tools
│   └── smoke.test.ts
├── FORK_NOTES.md             ← what was kept, what was stripped, upgrade hints
└── README.md
```

### Vendor strategy

1. **Clone the harness** at a known-good commit (pin the SHA in `FORK_NOTES.md`).
2. **Identify kept subsystems** from `state.harness.forkSubsystems.kept`. The harness profile
   maps subsystem IDs to source file globs.
3. **Copy only kept code** into `vendor/`. Maintain the harness's internal directory structure
   so internal imports work.
4. **Find broken imports.** If a kept file imports a discarded one, surface this:
   - If the discarded import is optional (feature flag), remove it
   - If it's load-bearing, ask the user: "Module `X` requires `Y` which you removed. Either
     keep `Y` after all, or stub it."
5. **Strip top-level entrypoints** (the harness's main CLI/TUI) — the user's interface replaces
   them.
6. **Rewrite the entrypoint** to call vendor's agent core with `state.agent.systemPrompt` and
   `state.tools`.
7. **Document the fork.** `FORK_NOTES.md` lists:
   - Source repo + pinned SHA
   - Kept subsystems
   - Discarded subsystems
   - Modifications made beyond pure removal
   - How to pull upstream changes (manual cherry-pick — the user owns this)

### What NOT to do in fork mode

- Don't try to make the vendored code "framework-agnostic" by adding abstraction layers
- Don't rename or restructure vendored files beyond removing them — keeps upstream cherry-picks
  tractable
- Don't strip tests if they're testing kept code — keep them, they're valuable signal
- Don't strip the original license / attribution — vendor it as-is

## Harness-specific fork hazards

Per-harness things the Core subagent MUST account for during Track B generation.

### OpenCode

- **Effect runtime.** Services are resolved via `Context.Service` + `serviceUse(...)` at runtime — stripping a subsystem can cause **runtime crashes** (not compile errors) when a kept module tries to resolve a discarded service.
- **Cross-subsystem leak:** `packages/opencode/src/mcp/index.ts` imports `TuiEvent` from `cli/cmd/tui/event.ts`. If user discards TUI but keeps MCP, this import must be patched or stubbed.
- **Recommended pattern:** for most users, edit `agent/prompt/*.txt` and `tool/registry.ts` IN PLACE rather than vendor-and-gut. The vendor path is only worth it if the user wants to remove ≥50% of subsystems. Surface this to the user before vendoring.
- **Bun-first.** `bunfig.toml` exists; some imports use Bun-specific paths (`#db`, `#pty`). Node compat is secondary — user should accept Bun as the runtime OR plan for compat work.
- **Default branch is `dev`,** not `main`. Pin SHAs from `dev`.

### OpenClaw

- **Gateway is THE chokepoint, not an optional subsystem.** OpenClaw is fundamentally a long-lived WebSocket daemon (default `127.0.0.1:18789`). Channels, companion apps, UI, and macOS/iOS/Android Nodes all connect to that Gateway over WS with typed schemas. The fork pattern is "trim the daemon" — NOT "embed the agent." This inverts typical SDK-fork patterns. If user wants an embedded agent, OpenClaw is a poor fit; recommend a Track A harness instead.
- **Pnpm workspace pinning is opinionated.** `pnpm-workspace.yaml` has 80+ `minimumReleaseAgeExclude` entries, strict `overrides` block, curated `allowBuilds` allowlist (`baileys: true`, `node-llama-cpp: true`, `@discordjs/opus: false`). Forks that prune casually will break native installs. Preserve the workspace file's structure when stripping packages.
- **`extensions/` is 136 plugins, not "5-10 channels".** The user's subsystem checklist needs to be paginated — 21 channel adapters + 57 LLM provider extensions + 58 bundled skills + ~50 misc plugins. Don't try to show this all on one screen.
- **Node + pnpm, NOT Bun.** Strict Node 22.19+ (24 recommended) + pnpm 11. Cleaner than OpenCode in this respect.
- **ClawSweeper plugin linter.** OpenClaw has a custom review system (documented in root `AGENTS.md`) that forbids cross-plugin `src/**` imports. After stripping, run ClawSweeper to catch violations the user may introduce.
- **Calendar-versioned releases** (`2026.5.26`-style). Pinning a SHA is more stable than pinning a tag.
- **Companion app dependency on Gateway.** The macOS/iOS/Android apps connect to the user's local Gateway daemon over WebSocket. If user strips Gateway, the companion apps don't work. If user strips companion apps, Gateway still works. One-way dependency — surface it.
- **Canvas + skills.** The Canvas host is served from the Gateway HTTP server under `/__openclaw__/canvas/`. The skills system (58+ bundled) is another orthogonal subsystem. Both are optional, both should be paginated in the Stage 2 subsystem checklist.

(Track B hazards for Hermes and Aider were documented in earlier iterations but those harnesses
were Python-only and were dropped in iter-3 when the skill became TS-only. If they're ever
restored, the original hazard inventories are in git history. ForgeCode was evaluated in iter-3
step 3 but excluded as Rust; if TS-only is relaxed, see the eval doc.)

## Mixed signals

If the user wants a library-shaped project but their chosen harness is fork-only (or vice
versa), tell them. Don't try to invert the harness's natural shape.
