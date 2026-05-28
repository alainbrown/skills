# Cascade Logic — Declared Dependencies

Each harness declares what features it provides and what it lacks. Each capability declares what features it requires and what choices it conflicts with. The skill walks this graph during the cascade: given the current set of choices, find unmet `requires`, find active `conflicts-with`, surface them.

This file is intentionally NOT a rule table of "if X then Y" — that pattern enumerates answers, silently misses conflicts the author didn't list, and overfits to the test set. The declared-deps approach lets the LLM reason transitively at runtime: if `HITL` requires `pause-resume-mechanism` and `Mastra` provides it, the link is computed at use time, not memorized at authoring time.

Replaces the earlier version (deleted in iter-3-post-eval) which had a 5-row "Cascading invalidation rules" table, a soft-scoring table, and 7 worked examples — 3 of which were near-verbatim matches to the iter-2 eval scenarios. The contamination produced an inflated harness-selection score in iter-2 (the skill was reading off a cheat sheet) and a real regression on cascade-transparency (the skill only flagged the 5 enumerated conflict types and missed second-order design tensions).

## Shortlist (TypeScript only, permissive-licensed)

| Track | Harness | License |
|-------|---------|---------|
| A | `vercel-ai-sdk` | Apache-2.0 |
| A | `openai-agents-sdk` | MIT |
| A | `langgraph` | MIT |
| A | `mastra` | Apache-2.0 (core; `ee/` carries a commercial license — never vendor it) |
| B | `opencode` | MIT |
| B | `openclaw` | MIT |

Each has a per-harness profile at `harness-profiles/<name>.md` with install, API surface, fork hazards.

Excluded (with reasons): Crush (FSL-1.1-MIT competing-use clause), Claude Agent SDK TS (Anthropic Commercial Terms — not OSI-permissive), ForgeCode (Rust, not TypeScript), OpenHands (Python core; TS portion is only a chat client over Python REST).

## Hard filters

Apply BEFORE the dep graph. Independent of capabilities.

```yaml
hard-filters:
  language:
    rule: state.capabilities.languagePreference must equal "ts"
    rationale: skill is TS-only as of iter-3; users wanting Python should pick a different skill or framework (pydantic-ai / smolagents / agno).
  license:
    rule: harness license must be MIT or Apache-2.0
    rationale: users build commercial tools; FSL non-compete clauses and Anthropic Commercial Terms are not OSI-permissive.
```

## Harness declarations

Each harness declares the FEATURES it provides and the ones it explicitly lacks. Features are intentionally short kebab-case identifiers — they're keys the dep graph matches on, not prose.

```yaml
harnesses:

  vercel-ai-sdk:
    track: A
    license: Apache-2.0
    provides:
      - primitives-only            # streamText + tool() + stopWhen — no Agent class
      - custom-agent-loop          # user writes the orchestration
      - multi-provider             # @ai-sdk/anthropic, @ai-sdk/openai, etc.
      - streaming-tokens
      - mcp
      - mcp-stdio
      - mcp-sse
      - mcp-streamable-http
      - runtime-portable           # works on Node, Bun, Workers, Vercel Edge, Deno
    lacks:
      - native-handoffs            # implementable as tool-sentinel; not first-class
      - native-voice-realtime
      - native-voice-pipeline
      - pause-resume-mechanism     # no built-in HITL primitive
      - native-memory-primitive

  openai-agents-sdk:
    track: A
    license: MIT
    provides:
      - native-handoffs            # handoffs: + handoff() helper
      - native-voice-realtime      # RealtimeAgent
      - native-voice-pipeline      # VoicePipeline + SingleAgentVoiceWorkflow
      - tracing
      - streaming-tokens
      - mcp
      - mcp-stdio
      - mcp-sse
      - mcp-streamable-http
      - openai-deep                # tightest integration with OpenAI provider
    lacks:
      - easy-provider-swap         # works best with OpenAI; others need a shim
      - pause-resume-mechanism

  langgraph:
    track: A
    license: MIT
    provides:
      - graph-orchestration        # explicit state graph
      - multi-agent                # subagents via graph nodes
      - multi-provider             # LangChain ecosystem
      - durable-execution          # checkpointers for long-running / resumable workflows
      - streaming-tokens
      - mcp
    lacks:
      - native-voice-realtime
      - pause-resume-mechanism

  mastra:
    track: A
    license: Apache-2.0
    provides:
      - ai-sdk-based               # built on Vercel AI SDK
      - multi-provider
      - pause-resume-mechanism     # requireApproval + approveToolCall / declineToolCall
      - memory-primitive           # @mastra/memory + LibSQLStore
      - playground                 # `mastra dev` ships a built-in web playground
      - streaming-tokens
      - mcp
      - mcp-stdio
      - mcp-sse
      - mcp-streamable-http
    lacks:
      - native-handoffs
      - native-voice-realtime
      - native-channel-adapters

  opencode:
    track: B
    license: MIT
    provides:
      - complete-coding-agent      # ready-to-fork CLI coding agent
      - tui-built-in
      - mcp                        # MCP client
      - lsp                        # Language Server Protocol context
      - multi-session
      - autocompact
      - undo-redo
      - permissions                # tool permission prompts (HITL-shaped at CLI)
      - 75-plus-providers
      - 18-builtin-tools           # bash, read, write, edit, glob, grep, web-fetch, ...
    lacks:
      - native-voice-realtime
      - native-channel-adapters
      - lean-app-shape             # heavy by design

  openclaw:
    track: B
    license: MIT
    provides:
      - complete-personal-assistant
      - native-channel-adapters    # 21 channels (Slack, Discord, Telegram, Signal, iMessage, Teams, Matrix, ...)
      - gateway-daemon-architecture
      - voice-companion-apps       # macOS / iOS / Android companion apps
      - canvas-ui                  # browser canvas hosted via Gateway HTTP
      - mcp                        # MCP client
      - paginated-subsystem-checklist  # 136 plugins — Track B presentation pattern (see SKILL.md Stage 2)
      - 57-llm-providers
      - 58-bundled-skills
    lacks:
      - lean-app-shape
      - first-party-cli-as-interface  # the CLI is for dev; channels are the user surface
```

## Capability declarations

Each capability declares the features it `requires` (must intersect with a chosen harness's `provides`) and any choices it `conflicts-with` (active conflict surfaces a cascade prompt).

```yaml
capabilities:

  HITL:
    requires:
      - pause-resume-mechanism
    conflicts-with:
      - interface == api
    rationale: |
      HITL needs the agent to suspend mid-execution. HTTP request/response and SSE don't
      support that across an API boundary; the skill does not attempt to fake it.

  voice-realtime:
    requires-any-of:
      - native-voice-realtime
      - native-voice-pipeline  # softer match — pipeline works for batch STT→agent→TTS
    rationale: |
      Realtime two-way voice needs native streaming voice. Batch STT (transcription) is
      different and far less constrained — see `voice-input-only`.

  voice-input-only:
    # User uploads audio; agent transcribes + processes. NOT realtime conversation.
    requires: []  # any harness; transcription is a single tool call (e.g., Whisper)
    note: |
      Do NOT route to RealtimeAgent or VoicePipeline for upload-and-process — that's overkill.
      Distinguishing `voice-input-only` from `voice-realtime` is part of capability extraction.

  multi-channel-3-plus:
    # 3+ messaging channels (Slack / Discord / Telegram / Signal / Matrix / etc.)
    requires-any-of:
      - native-channel-adapters
      - willingness-to-build-each-adapter  # ~150-300 LOC per channel; user time
    rationale: |
      Track A harnesses ship primitives, not channels. Adding 3+ channels to a Track A
      harness is real work; Track B (openclaw) gives them for free.

  multi-agent-handoffs:
    requires-any-of:
      - native-handoffs
      - graph-orchestration
      - willingness-to-build-handoff-mechanism  # tool-sentinel pattern

  swappable-provider:
    requires:
      - multi-provider

  mcp-must:
    requires:
      - mcp

  durable-multi-day-workflow:
    requires-any-of:
      - durable-execution
      - willingness-to-build-checkpointing

  multi-runtime-deploy:
    # User wants the same codebase deployable to multiple of {Node, Bun, Workers, Vercel Edge, Deno}.
    requires:
      - runtime-portable

  scheduling:
    requires: []
    note: |
      Any harness + a cron worker on top. Cron is implementation detail, not a harness constraint.
      Don't surface as a cascade trigger.
```

## How the cascade walks the graph

**At Stage 2 (harness selection):**

1. **Apply hard filters.** Drop harnesses failing language or license. The 6 shortlisted harnesses currently pass.
2. **Walk the dep graph.** For each capability extracted from the user's brief (Stage 1), find the harnesses whose `provides` satisfies the capability's `requires` (or `requires-any-of`). Eliminate harnesses whose `lacks` intersects with required features.
3. **Surface `conflicts-with` eagerly.** If any capability's `conflicts-with` matches a current choice, raise the cascade prompt now — don't wait until generation.
4. **Recommend the intersection set.** Multiple harnesses may survive — that's fine. Present them with the brief's specific signals that would break the tie. If the brief is silent on the discriminating signal, ASK the user; do not pick arbitrarily.
5. **Let user override.** If user picks a harness that fails the dep graph (e.g., explicit pick of mastra with voice-realtime in scope), surface the unmet dep and ask.

**When a later stage (interface / tools / UX / mock) adds a capability:**

1. Re-walk the graph from the current choice set.
2. If a capability's `requires` isn't satisfied by the chosen harness's `provides`, OR its `conflicts-with` matches a current choice, surface a cascade prompt with options.
3. The LLM is trusted to derive transitive consequences — e.g., user adds HITL → HITL's `conflicts-with: interface == api` activates if api was picked earlier → surface even if no rule explicitly enumerates "Stage 4 adds HITL while interface is api."

**Beyond declared deps — design tensions worth flagging.**

Some tensions don't reduce to harness `lacks` + capability `requires`. They're choices the brief hasn't pinned down that will need resolution later. Examples (NOT enumerated — illustrative):

- Citations: tool-shaped (agent calls `cite()`) vs convention (system prompt instructs agent to emit `[N]` markers). Both work; they have different cost models.
- Vault storage: markdown on disk vs SQLite vs both (disk canonical, SQLite derived). Affects file watcher design, sync semantics, backup story.
- Multi-provider embedding: chat provider is swappable; what about embeddings? Anthropic doesn't ship embeddings; if the user wants pure-Anthropic and embeddings, that's actually a 2-provider design.

The skill should pause at the end of Stage 5 (after capabilities → harness → interface → tools → UX) and ask: "given these choices, what tensions are still un-resolved?" This is generative, not rule-based. Don't try to enumerate it.

**Cascade prompt template** (verbatim format):

```
Heads up — your latest answer changes the recommendation.

  You earlier picked: <harness X> (Track <A|B>, <reason>)
  You just added:     "<new capability>"

  These conflict: <X> lacks <feature Y> that <new capability> requires.

  Options:
    a) Drop <new capability> and stay on <X>
    b) Switch to <harness Z> (provides <Y>)
    c) Build <Y> on top of <X> (cost: <estimate>)

  Which?
```

Log every cascade change to `state.cascadeChanges` (see `state-schema.md`).

## One-shot example walks

These illustrate the dep-graph walk shape on scenarios that are explicitly NOT in the eval test suite. They are calibration — the WALK structure is what to learn, not the verdicts. Eval scenarios may or may not land on the same harnesses as the examples; that's noise, not signal.

### Example 1 — Earnings-analysis web chatbot

> "I want a web chatbot where users can ask 'how did NVDA's Q3 do' and the bot pulls financials, computes ratios, generates a chart, cites sources. Users should be able to swap between Anthropic and OpenAI in settings."

Capability extraction: `interface: web`, `mcp-must` (financial-data MCP), `swappable-provider`, citations (convention), session persistence, streaming, no HITL, no voice, no multi-channel.

Walk:
- Hard filters pass.
- `swappable-provider` requires `multi-provider` → drops openai-agents-sdk (lacks easy-provider-swap).
- `mcp-must` requires `mcp` → remaining 5 pass.
- Track B harnesses don't fit (no signal for "fork a complete agent"); drop opencode + openclaw.
- Remaining: {vercel-ai-sdk, langgraph, mastra}.
- `graph-orchestration` (langgraph) is not requested (no multi-agent, no checkpointing) → langgraph adds machinery the brief doesn't need.
- Tie between vercel-ai-sdk and mastra. The brief says "user can swap providers in settings" (a USER feature) — suggests persistence of preferences and a settings UI. Mastra's `memory-primitive` covers per-user state; vercel-ai-sdk leaves persistence to user code.
- Brief silent on "lean app vs batteries included." **Ask the user** which way to break the tie.

### Example 2 — HITL pricing-research desktop agent

> "Pricing research tool. Every morning, scrape these 8 competitor websites, distill each page into a 200-word brief of price changes / new SKUs / promotions, propose adding each brief to my notes folder; I review each one and approve before it lands."

Capability extraction: `interface: electron`, `HITL` (on writes), `scheduling` (daily cron), web-fetch, persistence (notes folder + memory of past scrapes), no multi-channel, no voice, no multi-agent.

Walk:
- Hard filters pass.
- `HITL` requires `pause-resume-mechanism` → only mastra provides it natively among Track A.
- `HITL`'s `conflicts-with: interface == api` doesn't activate (interface is electron, not api).
- openclaw also has `pause-resume-mechanism` via its plugin system, but the brief doesn't ask for multi-channel or any other openclaw feature → forking openclaw for one capability is overkill (Track B-shaped scope vs Track A-shaped scope).
- `scheduling` is implementation (cron worker on top of any harness) — no harness constraint.
- Persistence: mastra's `memory-primitive` (LibSQL) gives "remember last week's prices" for free.
- **Recommend: mastra Track A.** Note that openclaw would also work but is much heavier — surface as alternative if the user wants the multi-channel option for later expansion.

### Example 3 — Voice meeting note-taker API

> "POST /transcribe with an audio file (WAV / M4A blob). Service transcribes, then extracts action items + decisions + open questions as structured JSON. No realtime — the audio is post-meeting upload. Deployable to Cloudflare Workers AND Vercel."

Capability extraction: `interface: api`, `voice-input-only` (NOT realtime), structured output, `multi-runtime-deploy`, no HITL (api conflicts), no multi-channel, no persistence (stateless).

Walk:
- Hard filters pass.
- `voice-input-only` requires nothing harness-specific — transcription is a tool call (e.g., Whisper). Do NOT route to openai-agents-sdk's RealtimeAgent or VoicePipeline; this is upload-and-process, not realtime conversation. Distinguishing `voice-input-only` from `voice-realtime` is the key call.
- `interface == api` + "minimal" intent (POST endpoint with structured output) + `multi-runtime-deploy` requires `runtime-portable` → favors vercel-ai-sdk (only harness with explicit `runtime-portable`).
- mastra works too but adds machinery (Memory, HITL) the brief doesn't use.
- **Recommend: vercel-ai-sdk + api-ts starter (Hono), `generateObject` for the structured output.** No HITL machinery in the produced project (the api+HITL combination was removed in iter-3-post-eval — see `references/interfaces/api.md`).

### Example 4 — Disk-space cleanup CLI

> "Scan my home directory, find what's bloating disk (old `node_modules`, stale `.cache`, downloaded VM images, deprecated package caches). Suggest cleanups, ask me before deleting each one. Show progress as it scans."

Capability extraction: `interface: cli`, `HITL` (on every destructive write), bash + file-ops, streaming progress, no MCP, no multi-channel, no voice, persistence optional (remember what was cleaned in past runs).

Walk:
- Hard filters pass.
- `HITL` requires `pause-resume-mechanism`. CLI has it naturally (terminal y/n prompt), but the cleanest is a harness that ships it as a first-class primitive. Mastra provides it; the other Track A harnesses can implement HITL via custom flows but it's less clean.
- Track B: opencode is a coding agent (wrong domain — this is sysadmin, not coding); openclaw is multi-channel (wrong shape). Both overshoot.
- **Recommend: mastra Track A + cli-ts starter.** `requireApproval: true` on the delete tool makes "ask me before deleting" first-class. Tools: bash + file-read + file-stat + a bespoke `find-bloat` tool + a bespoke `delete-with-confirm` tool wired with `requireApproval`.
- Alternative: vercel-ai-sdk with hand-rolled HITL pattern. More code; user owns the loop. Surface if the user prefers minimal abstraction over batteries-included.

## Where the cascade is NOT rule-based

Some things are not deps and should not be in this file:

- **Track A vs Track B preference.** That's a user judgment ("lean app on a framework" vs "complete agent to fork"). Surfaced at Stage 2 as a question, not derived from declared features.
- **Domain match.** "Coding domain → recommend coding-leaning harness" is content not in declared features (opencode is the only coding-domain Track B; the rest are domain-agnostic). When domain biases toward a Track B harness, the rationale belongs in the Stage 2 recommendation prose, not in the declared deps.
- **Engineering polish.** Slack 3-second ack rule, OpenCode `path.posix.join` quirk, Mastra package version sprawl. These belong in `harness-profiles/<name>.md`, not in cascade-logic.

If a tension surfaces during the cascade that doesn't reduce to declared deps + conflicts, surface it as a design question for the user. Don't try to grow this file into an answer database.
