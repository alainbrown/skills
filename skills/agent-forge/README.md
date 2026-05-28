# agent-forge

Build a working agent application by picking a permissive-licensed harness and customizing a vendored starter project. Cascading interview: capabilities → harness → interface → tools + MCP → agent UX policy. Produces a runnable project where the agent loop, tools, LLM, and streaming chat experience all work end-to-end.

## Usage

Describe what you want to build:

```
build me a Slack bot that reviews PRs for security issues
I need a voice customer support agent that swaps providers
personal assistant across Telegram + Discord with reminders
lean CLI coding agent for my repo, OpenAI ecosystem
```

Or invoke directly:

```
/agent-forge
```

## What it does

agent-forge walks you through an 8-stage cascade, then generates the project by **copying a pre-built interface starter and dropping in a harness-specific agent snippet** — not by writing from scratch. The LLM edits known-good code rather than generating it, which dramatically improves bootability.

1. **Capabilities** — domain, interactivity, channels, voice/vision, scheduling, language, provider, MCP
2. **Harness** — recommended from a curated 7 (4 Track A + 3 Track B), reasoning visible, license-checked
3. **Interface** — CLI / Web (Next.js) / Electron / API (Hono), cost surfaced if "hard" for the chosen harness
4. **Tools** — MCP servers + bespoke tools, exhaustive stateless tests + skip-with-message integration tests
5. **Agent UX policy** — error handling, streaming, persistence (user-controlled — skill defaults to fail-fast only when deferred)
6. **Mock-iterate** *(new in iter-3 step 5)* — visual mock of the chosen interface (HTML+Tailwind for web/electron, OpenAPI 3.1 + Swagger UI for api, markdown transcripts for cli) served via `npx serve`; user reviews and iterates with the skill ("smaller approval panel", "add a copy button"); approves; mock locks as design spec
7. **Generate** — copy starter + drop snippet + customize prompt/tools/UX from approved mock (Track A); or clone harness + strip subsystems (Track B)
8. **Eval** *(new in iter-3 step 6)* — three levels: smoke (install + typecheck + test + boot), behavior (subagent-as-LLM grader runs each scenario without an API key, scoring against a rubric; primary signal), real-model spot-check (optional, requires API key; validates simulation generalizes). Scenarios are baseline (filtered by applicability) plus 2-3 project-specific generated from state. `evals/` ships in the produced project as a re-runnable quality bar.

When a later answer invalidates an earlier decision (cascade), the skill surfaces the conflict with the exact prior decision, options, and asks the user — never silently switches.

## Architecture

TypeScript-only as of iter-3. Python was supported earlier; users who need Python should pick a different skill or framework (pydantic-ai, smolagents, or agno are reasonable starting points).

**Track A (library import — 4 harnesses):**
- `vercel-ai-sdk` (TS, Apache 2.0) — primitives (`streamText` + `stopWhen` + `tool()`), you build the loop. Pick this when you want minimal abstraction.
- `openai-agents-sdk` (TS, MIT) — handoffs, tracing, voice (RealtimeAgent + VoicePipeline)
- `langgraph` (TS, MIT) — production standard for stateful workflows, multi-agent
- `mastra` (TS, Apache 2.0 core) — playground via `mastra dev`, AI SDK based, native HITL via `requireApproval`

**Track B (fork-and-strip — 2 harnesses):**
- `opencode` (TS, MIT) — de facto OSS coding agent (~165K stars). Niche: coding CLI agent.
- `openclaw` (TS, MIT) — personal assistant monorepo (250K+ stars, OpenAI-sponsored under non-profit stewardship). Niche: multi-channel personal assistant (21 channel adapters, voice, companion apps for macOS/iOS/Android, Canvas). Gateway-daemon architecture, not embedded-agent.

License filter: permissive only (MIT / Apache 2.0). Dropped Crush (FSL-1.1-MIT — competing-use restriction) and Claude Agent SDK TS (Anthropic Commercial Terms). Evaluated and excluded: ForgeCode (Rust, not TypeScript — same constraint that dropped Codex / Goose / Crush), OpenHands (Python core with TS frontend — agent isn't a TS fork target).

## Features

- **Cascading invalidation** — when a later answer breaks an earlier one, skill surfaces the conflict explicitly with options and asks for resolution. Never silently switches.
- **Behavioral eval generation** — Stage 7 ships an `evals/` directory in every produced project with baseline scenarios (boot, tool-call, persona-style, error-policy, streaming, HITL-approve), 2-3 project-specific scenarios generated from state, a grader rubric, and three runners: `pnpm eval:smoke` (build correctness), `pnpm eval:behavior` (subagent-as-LLM grader; primary signal; no API key needed), `pnpm eval:real` (optional spot-check against real model). Results land in `evals/results/<ISO>.jsonl` and can be compared across runs as the agent design evolves.
- **Mock-first design loop** — Stage 5.5 produces a visual mock of the chosen interface BEFORE any code is written. HTML+Tailwind for web/electron (5 states: default/empty/streaming/approval/error — with a state-switcher toggle), OpenAPI 3.1 spec + Swagger UI for api, named markdown transcripts for cli. Skill serves the mock via `npx serve` (or the user opens the transcript in their editor), the user reviews and asks for changes in chat, skill edits the mock files surgically, repeat until approve. Approved mock ships in the produced project at `mocks/` as the design spec; for api, `openapi.yaml` also lands in the project root as the production contract that the Hono routes are annotated against.
- **Copy-starter + drop-snippet generation** — projects start from vendored interface starters (4 of them — cli-ts (Ink-based), web-ts (Next.js), electron-ts (Electron Forge), api-ts (Hono, multi-runtime), all bootable + tested) and harness-specific agent snippets drop into placeholder blocks. LLM does surgical customization, not from-scratch generation.
- **9 bespoke common tools** — bash, file-read, file-write, file-edit, multi-edit, glob, grep, web-fetch, todo-write — vendored TS files (~80 LOC each) the user owns. Stage 4 offers bundles (Coding / Research / Minimal / Framework / Custom) for quick selection.
- **UI components for agent patterns** — `references/ui-components/web/` and `references/ui-components/cli/` each ship 4 sibling components (TodoList, ApprovalPanel, DiffView, CitationPopover) with shared prop shapes. Skill includes the matching component when tool/feature pairing requires it.
- **Track A vs Track B** — library import (lean app on top of a framework) vs fork-and-strip (clone capable agent, customize). Skill picks the right pattern per harness.
- **Track B paginated subsystem visibility** — for fork-and-strip harnesses (OpenCode has 18 built-in tools + MCP client + LSP + multi-session; OpenClaw has 136 plugins across 21 channels + 57 providers + 58 skills), skill enumerates kept-vs-discarded subsystems with paginated multi-page checklists so user sees scope.
- **Harness-specific fork hazards** — codified per harness. OpenCode uses Effect runtime service resolution, has a cross-subsystem TUI ↔ MCP leak, Bun-first runtime, default branch is `dev`. OpenClaw is a Gateway-daemon architecture (long-lived WebSocket process at `127.0.0.1:18789`), Node + pnpm (not Bun), 80+ entries of pnpm version pinning, ClawSweeper plugin linter forbids cross-plugin `src/**` imports.
- **Permissive-license-only shortlist** — every recommended harness has MIT or Apache 2.0 base license, OK for commercial use.
- **Tool wiring with exhaustive tests** — MCP servers + custom tools + per-tool tests following schema (stateless: happy + every failure mode; integration: skip-with-message).
- **User-controlled UX policy** — error policy (per category), streaming behavior, persistence are user choices. Skill is opinionated about implementation (harness, tool layer) but not about agent UX.

## Test scenarios (evaluation suite)

### Iteration 1 (4 tests × 6 criteria = 24 graded comparisons)

1. **commit-drafter (CLI)** — reads `git diff --staged`, drafts a conventional-commit message, HITL approval before commit. Tests app-orchestrated HITL vs mid-stream pause-resume mechanisms.
2. **legal-qa (web)** — Next.js chatbot for contract Q&A with multi-step retrieve-then-synthesis-then-VERIFY workflow + mandatory citations + multi-tenant sessions. Tests structural-workflow vs convention-driven verification choice.
3. **finance-categorizer (electron)** — three-pane desktop app for CSV bank transactions with HITL on rule changes. Tests the dep graph's HITL → pause-resume-mechanism route.
4. **resume-api (api)** — PDF/DOCX to structured JSON, multi-runtime (Workers + Vercel), minimal abstraction. Tests `runtime-portable` declared dep + the api+HITL conflict as a negative test.

All four chosen to NOT overlap any of the 11 scenarios reserved as references inside the skill (4 calibration walks in `cascade-logic.md`, 3 mock/schema themes, plus 4 prototyping briefs from skill development). Future eval rounds must continue picking scenarios outside the reference pool.

## Eval results

**Iteration 1: 21W / 3T / 0L across 24 graded comparisons.** Zero baseline wins. Read in two halves to keep the framing honest:

**Half 1 — open criteria (4 criteria × 4 evals = 16 comparisons):** **13W / 3T / 0L = 81.25% raw, 90.6% net.** These criteria (harness-selection-fit, cascade-transparency, tool-wiring-and-test-schema, bootability) measure things the baseline can also reasonably do — they're a fair head-to-head.

**Half 2 — skill-structural criteria (2 × 4 = 8 comparisons):** **8W / 0T / 0L.** These (mock-iterate-stage, eval-template-stage) test whether the output references stages DEFINED IN the skill. The baseline structurally cannot match — not a fair fight, just measurement that the structured stages remain unique.

**Composite all-24:** 87.5% raw / 93.75% net. Don't read the composite as "the skill outperformed baseline by 93.75%" — half of it is intrinsic surface the baseline can't compete on by construction. **The honest read is: open-criteria 90.6% net, structural-criteria uncontested.**

| Test | Skill | Tie | Baseline | Verdict shape | Notes |
|------|-------|-----|----------|---------------|-------|
| commit-drafter | 5 | 1 | 0 | **convergent** (both Vercel AI SDK + CLI) | Skill won walk quality; tie on bootability (skill used copy-starter pattern, baseline pinned versions — each prong went to a different output). |
| legal-qa | 5 | 1 | 0 | **divergent** (skill: Mastra Workflows; baseline: Vercel AI SDK + hand-rolled state machine) | Skill won by walking the dep graph and explicitly engaging the structural-vs-prompted verify choice. Tie on cascade-transparency — both surfaced real tensions, different shapes. |
| finance-categorizer | 6 | 0 | 0 | **divergent** (skill: Mastra + `requireApproval`; baseline: Vercel AI SDK + custom `stopWhen` HITL) | Skill swept. Declared-dep walk routed HITL → pause-resume-mechanism → Mastra; baseline reached comparable engineering via custom pattern but didn't engage with declared cascade structure. |
| resume-api | 5 | 1 | 0 | **convergent** (both Hono + AI SDK) | Skill explicitly cited Example 3 from cascade-logic.md (`runtime-portable` is the only harness-distinguishing feature for multi-runtime briefs). Tie on bootability. |

**Per-criterion summary:**

| Criterion | W / T / L | Notes |
|-----------|-----------|-------|
| harness-selection-fit | 4 / 0 / 0 | Dep-graph walks landed defensible recommendations on all 4 scenarios, including 2 divergent verdicts. |
| cascade-transparency | 3 / 1 / 0 | No losses; with-skill outputs surfaced 6-10 design tensions per scenario, including the "end of cascade ask" pattern. |
| tool-wiring-and-test-schema | 4 / 0 / 0 | Bundle naming + skip-with-message convention consistently differentiated. |
| bootability | 2 / 2 / 0 | Skill wins on harness-API-heavy designs (copy-starter pattern); ties on lean Vercel AI SDK projects where baselines produce comparable trees with pinned package versions. |
| mock-iterate-stage | 4 / 0 / 0 | Baseline structurally cannot match (skill-defined Stage 5.5). |
| eval-template-stage | 4 / 0 / 0 | Baseline structurally cannot match (skill-defined Stage 7). |

### Coverage gaps in iteration-1 suite

- **Track B harnesses** (opencode, openclaw) — no iter-1 scenario routed here.
- **langgraph** — the legal-qa scenario should have routed here (declared `graph-orchestration` is unique to langgraph), but the with-skill subagent picked Mastra Workflows on TS-native + playground tie-breakers. The grader rewarded engagement quality, but "does the skill actually route to langgraph when needed?" is un-tested.
- **cli for non-coding-adjacent agents** — commit-drafter touches git, coding-adjacent.

### Eval methodology caveats

- Self-graded simulation (same model family across worker / baseline / grader subagents).
- Degraded bias-control mode (the grader's Read tool gives access to the rubric before scoring; sentinel-only discipline per the eval-template `run-behavior.md` documented fallback).
- Single grader per eval (no inter-grader reliability check).
- No produced project built and run end-to-end.

Results are structured predictions, not independent empirical checks. Real-model behavior may differ.

## Where the skill adds value

1. **Harness-selection-fit via dep-graph walks** — 4/0/0. The cascade-logic.md mechanism (declared `provides`/`lacks` per harness + `requires`/`conflicts-with` per capability) gives the LLM a structural framework to walk at runtime. Both divergent verdicts (legal-qa: Mastra Workflows over Vercel AI SDK; finance-categorizer: Mastra over custom HITL) went to skill because the dep-graph walk was more rigorous than baseline's ad-hoc reasoning.
2. **Mock-iterate (Stage 5.5)** — 4/0/0. Baselines produce ad-hoc mocks (or none) and don't engage with the "user reviews mock before code" loop. Skill consistently ships `mocks/` (and `openapi.yaml` for api) as design spec.
3. **Eval-template (Stage 7)** — 4/0/0. Three-tier (smoke / behavior-via-subagent-grader / real-model spot-check) with applicability filtering + commit-trace-before-rubric bias control. Baselines have flat test suites; no three-tier separation; no bias control on simulated graders.
4. **Tool-wiring + test schema** — 4/0/0. Common-tools bundle naming (Coding / Research / Minimal / Custom) + skip-with-message convention for integration tests. Baselines have good per-tool tests but don't match the schema's structure.
5. **Cascade-transparency** — 3/1/0. The dep-graph approach engages with design tensions outside the documented cascade — citations-as-tool-vs-convention class, hidden second-provider concerns (Anthropic embeddings), structural-vs-prompted choices. The "Where the cascade is NOT rule-based" section in `cascade-logic.md` makes this explicit.

## Where the baseline holds up

1. **Bootability via inline package-version pinning** (ties on commit-drafter and resume-api). When the chosen harness is lean (vercel-ai-sdk), baselines produce bootable trees with pinned package versions from inline knowledge. The skill's copy-starter pattern still wins on harness-API-heavy designs (the divergent verdicts both went to skill on bootability), but on lean stacks the daylight closes. Worth lifting "always pin specific package versions" into generation guidance.
2. **Engineering breadth in cascade-decisions sections.** Baselines often surface 10-14 cascade decisions covering broader infra/ops ground (vector stores, audit logging, OCR scope, multi-tenancy depth, cost ceilings). Skill outputs tend toward 6-10 tensions but tighter to the brief's specific architectural choices. Different shapes; neither strictly better.
3. **PDF parsing via Claude native document block** (resume-api baseline) — sidestepped local PDF parsing by using Claude's native document content block. The skill picked `unpdf` (Workers-native). Both work; the Claude-native path is a strong engineering choice the vercel-ai-sdk profile doesn't currently document.

## Next-iteration candidates

- **candidate-1: evaluate elizaOS/eliza for Track B shortlist.** A real existing TS multi-channel agent with Discord / Slack / Telegram clients shipped; MIT-licensed; in production. OpenClaw is currently the only multi-channel Track B option in the shortlist; Eliza is a defensible alternative worth profiling.
- **candidate-2: lift channel-specific test patterns** into `tool-test-schema.md`. `chrono-node` for time tools, `msw` for HTTP tools, per-channel markdown rendering tests (Slack mrkdwn vs Discord md vs Telegram MdV2).
- **candidate-3: harness profile updates.** (a) The legal-qa eval suggests the skill's langgraph TS profile may understate maturity — verify against the current `@langchain/langgraph` package's actual TS API surface. (b) Document Anthropic's native PDF document content block in the vercel-ai-sdk profile as the alternative to local-parser tool calls when the provider is Anthropic.
- **candidate-4: package version pinning in the generation step.** Bootability ties came from baselines pinning specific package versions inline. Add a generation note: after copying the starter, `pnpm view <pkg>@latest version` for the harness package + key satellites; pin to current minor or document the rationale.
- **candidate-5: future eval round must exercise Track B + langgraph + non-coding cli.** iteration-1 didn't naturally cover these. Pick scenarios where the dep graph makes one of them the discriminating route. Continue picking scenarios outside the existing reference pool.

## Design notes

- **Why 7 harnesses (not more):** the curated shortlist trades breadth for depth. Each harness has a thorough profile (~150-350 LOC) so generation subagents have accurate API patterns. Adding a 12th harness means another 150+ LOC profile to maintain.
- **Why 5 interface starters (not per harness × interface):** harness-agnostic starters keep combinations manageable. 5 starters × 7 harnesses = 35 combinations, all served by the same "copy starter + drop snippet" pattern. Per-combination starters would be 35 directories of nearly-duplicate code.
- **Why "permissive-only" license filter:** users build commercial tools. FSL (Crush) has a competing-use clause incompatible with most commercial use cases. Anthropic Commercial Terms (Claude SDK TS) isn't OSI-permissive. Skill drops them; TS-on-Anthropic users route to Mastra / LangGraph / OpenAI SDK with anthropic provider.
- **Why "user-controlled UX policy":** the skill is opinionated about *implementation* (which harness, which patterns) but neutral on *agent UX* (errors, streaming, persistence). Different agents need different policies; the skill asks rather than decides.
