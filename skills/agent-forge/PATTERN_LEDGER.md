# Pattern Ledger

A living tracker of framework primitive *candidates* discovered across research exercises. Each entry records: what the pattern is, where it has appeared, how stable its shape is, and whether it's ready for extraction.

## Discipline

Patterns enter this ledger when they appear in a research exercise (an actual app built using the skill). They are **candidates** for extraction into a `@forge/*` framework package — not framework code yet.

**Extraction trigger:** a pattern is a candidate for extraction when EITHER of these is true:
- It has appeared in **3+ research exercises** with the same shape (the shape is stable)
- It has appeared in **2 research exercises** AND represents >200 LOC of non-trivial correctness (race conditions, security boundaries, complex IPC) that's easy for any future consumer to get wrong

Until trigger, patterns stay either:
- In their original research exercise project (if not yet reused), or
- In `references/patterns/<name>/` (if reused in the skill's references or another exercise)

When extraction triggers, a pattern moves to `@forge/<name>` (published or internal) and the ledger entry transitions to `extracted`.

## Status definitions

- **watch** — Recorded as a pattern from a single research exercise. Not extracted; not yet reused. May be project-specific.
- **drifting** — Appeared in 2+ exercises but the shape isn't yet stable (different APIs, different responsibilities). Need more data.
- **stable** — Shape has stabilized across exercises. Approaching the extraction threshold.
- **soon** — Meets extraction criteria. Next step is extraction (decide name, surface API, ship).
- **extracted** — Lives as a `@forge/*` package. Pattern entry retained for history.

## Current ledger

### Candidates from wiki-agent (research exercise #1, May 2026)

| Pattern | Description | Status | LOC | Notes |
|---------|-------------|--------|-----|-------|
| `approval-bridge` | Per-session resolver map + AbortController + IPC bridge for HITL across a process boundary. Includes race-condition-safe ordering (Promise constructed BEFORE event yielded). | **watch** | ~200 | First sighting in wiki-agent's `agent-bridge.ts` Phase D. Saved a real "hang forever" bug. Strong primitive candidate. |
| `rooted-fs` | Single-rooted-tree FS primitive with traversal guard: `..`-segment surface check + path-resolve-and-check-prefix. | **watch** | ~80 | First sighting in wiki-agent's `file-system.ts` + wiki tools' `_helpers.ts`. Caught a real CVE-class bug (`path.posix.join` collapsing `..` segments). |
| `skill-lookup-tool` | Convention for agents reading skill content at runtime: regex-extracts named sections from SKILL.md, reads reference files, per-session cache. | **watch** | ~100 | First sighting in wiki-agent's `wiki-skill-lookup.ts`. Empirically unvalidated (no real-model run yet). |
| `electron-three-pane-workspace` | PanelGroup layout + sidebar tree (file-watcher-backed) + central editor (CodeMirror with debounced auto-save) + right panel slot. | **watch** | ~1500 | First sighting in wiki-agent's `Sidebar.tsx` + `Editor.tsx` + `App.tsx` + `file-watcher.ts`. Very project-shape-specific but recurs whenever a user wants an Obsidian/Cursor-like agent UI. |
| `agent-stream-contract` (HITL flavor) | Richer stream contract for HITL-capable agents: yields carry `streamId`, events include `approval_request` and `approval_resolved` variants. | **watch** | ~50 | Surfaced in wiki-agent as the change needed to retrofit HITL onto the basic streaming contract. Asymmetry between non-HITL and HITL contracts is the candidate primitive. |

### Candidates from iter-3 step 6 work (May 2026)

Step 6 added Stage 7 (eval, replacing the old verify) with three levels: smoke, behavior (subagent-as-LLM grader), and real-model spot-check. Canonical scaffolding lives at `references/eval-templates/` and gets copied into every produced project at `evals/`. Patterns surfaced:

| Pattern | Move | Notes |
|---------|------|-------|
| (new) `subagent-as-llm-grader` | first sighting → **watch** | The pattern of "use a subagent to simulate an agent's behavior on a scenario, then grade the simulated trace against a rubric — no API key needed." First sighting in agent-forge Stage 7 behavior level. Inherited from `skill-forge`'s skill evaluation pattern; this is the second skill to use it. Triangulation criterion partially met — the GRADER shape is consistent across both skills, but the input shape (skill design vs agent design) differs. Need a 3rd sighting before promoting. **Watch-for:** the wiki-agent first run scored 11/12 on an agent with documented Phase C+D gaps (Gap 1 editor↔agent sync, Gap 6 Rolldown packaging, no real-model integration test). A clean run on a non-clean agent suggests scenario coverage doesn't probe deep gaps and/or the grader is over-charitable. Tighten as more exercises run. |
| (new) `bias-controlled-grading-prompt` | first sighting → **watch** | The convention of "commit to a simulated trace BEFORE reading the rubric criteria" — addresses the failure mode where graders write their trace to score well rather than to predict honest agent behavior. First sighting in agent-forge's `rubric.md`. Likely applies to any subagent-as-LLM grading; not specific to agents. |
| (new) `scenario-applicability-gates` | first sighting → **watch** | Conditional scenarios that skip themselves based on state expressions (e.g., "skip streaming scenarios when streaming is disabled"). Lets a baseline scenario set serve agents with different capability profiles. First sighting in agent-forge eval template YAML schema. |
| (new) `eval-results-jsonl-log` | first sighting → **watch** | Results land as JSONL files keyed by ISO timestamp, one row per scenario, allowing cross-run comparison as the agent design evolves. First sighting in agent-forge `evals/results/`. Recurs for any iterative-design quality bar. |
| `agent-skill-bridge` (was: `skill-lookup-tool`) | **watch** (simulation positive; real-model spot-check is the actual validation gate) | See verdict paragraph below the table. |

**agent-skill-bridge** (wiki-agent first eval, 2026-05-26): the bridge pattern — `wiki_skill_lookup` fetching procedure prose from the llm-wiki skill at runtime — is **structurally validated** by the first behavior eval. Across both load-bearing scenarios (`project-01-skill-lookup-before-ingest`, `project-02-skill-lookup-before-query`), the simulated trace shows `wiki_skill_lookup` called BEFORE the procedure-bound operations (web_fetch/wiki_write_page for ingest; wiki_grep/wiki_read_page for query). All 6 project scenarios passed; 11/12 overall (one partial on conciseness, unrelated to the bridge). **Caveat:** this run was self-graded inside a single context — the Task tool was unavailable to the eval harness, so the rubric's structural bias-control discipline degraded to sentinel-only. The result is a structured prediction, not an independent empirical check. Status: **watch → leaning stable**, qualified by "real-model spot-check is the next gate." Promote to `stable` only after `eval:real` confirms the simulated ordering against the actual model.

**Eval-template gap surfaced by the wiki-agent retrofit**: the canonical `run-behavior.md` plan assumes the executing harness has the Task tool (used to launch isolated grader subagents per scenario; criteria literally not in the grader's context until it Reads them). When Task is unavailable (e.g., the harness is itself a subagent), the documented manual fallback applies — write all traces in a single block with `--- TRACE COMMITTED ---` sentinels before grading — but bias control degrades from structural to discipline+sentinel. Worth tightening the template to either (a) make this fallback more prominent in the README, or (b) detect Task-unavailable at eval start and require an explicit user ack of the degraded mode. Filed for a future step.

### Candidates from iter-3 step 5 work (May 2026)

Step 5 added Stage 5.5 (mock-iterate) between UX policy and Generate. Per-interface mock starters live in `references/mocks/<web|electron|api|cli>/` (SCHEMA.md + starter/). Mocks are reviewed by the user via `npx serve` (web/electron/api) or editor (cli), iterated on with the skill in a design conversation, then approved. Approved mocks ship in the produced project. For API, the OpenAPI 3.1 spec also lands in the project root as the production contract.

| Pattern | Move | Notes |
|---------|------|-------|
| (new) `mock-first-design-loop` | first sighting → **watch** | The pattern of "scaffold a visual mock from a per-interface schema, serve it locally, user iterates in chat, lock the design before code is written." First sighting in agent-forge Stage 5.5. Recurs whenever a code-generation skill produces an artifact with a visual or contract face. Triangulation needed: a 2nd skill (UI scaffolder, static-site generator, dashboard builder) using the same loop bumps to drifting. |
| (new) `openapi-spec-as-contract` | first sighting → **watch** | For api interfaces, the OpenAPI 3.1 spec serves BOTH as the user-reviewed mock AND as the production contract that ships in the project root. The schema → contract → handler chain is unbroken. First sighting in agent-forge's api mock starter. Recurs whenever an agent has a programmable interface. |
| (new) `interface-state-toggle-mock` | first sighting → **watch** | Pattern of "single self-contained HTML mock with N visual states selectable via a top-of-page toggle." Lets a user preview default/empty/streaming/approval/error states without simulating real events. First sighting in agent-forge web + electron mock starters. The state-switcher pattern is also useful for component galleries and design systems. |

### Candidates from iter-3 step 3 work (May 2026)

Step 3 was a focused expansion of the Track B shortlist after the OpenCode-only state hit user friction (the personal-assistant niche was wide open). Patterns surfaced:

| Pattern | Move | Notes |
|---------|------|-------|
| (new) `gateway-daemon-architecture` | first sighting → **watch** | The pattern of "the agent is a long-lived WebSocket daemon that channels and UIs connect to" — first sighting in OpenClaw's Gateway. Inverts typical SDK fork patterns ("trim the daemon" not "embed the agent"). Recurs whenever a user wants a multi-process / multi-channel agent. |
| (new) `paginated-subsystem-checklist` | first sighting → **watch** | When a Track B harness has 50+ subsystems (OpenClaw's 136), Stage 2's "check what to keep" list can't fit on one screen. Pattern: paginate into logical groups (channels / providers / skills), let user navigate page-by-page. First sighting in the OpenClaw subsystem inventory work. |

### Candidates from iter-3 step 2 work (May 2026)

Iter-3 step 2 wasn't a research exercise (no new app built), but the work brought several wiki-agent candidates into `references/` as vendorable primitives. Status moves are documented here for the audit trail:

| Pattern | Move | Notes |
|---------|------|-------|
| `approval-bridge` | watch → **drifting** | Partially landed: `ui-components/web/ApprovalPanel.tsx` and `cli/ApprovalPanel.tsx` are the renderer side. The actual bridge logic (per-session resolver Map + race-safe ordering + AbortController) is still wiki-agent-only. When a 2nd research exercise builds a HITL-capable agent and reuses this logic, it crosses the trigger. |
| (new) `tool-with-ui-pattern` | first sighting → **watch** | The pattern of "tool persists state to a file + UI component watches the file." `todo-write` tool + `TodoList` component is the first instance. Identifies a class of agent UI integration that's neither pure tool nor pure component. ~80 LOC tool + ~150 LOC web component + ~100 LOC cli component. |
| (new) `web-cli-component-pair` | first sighting → **watch** | The convention of `ui-components/web/<Name>.tsx` + `ui-components/cli/<Name>.tsx` sharing prop shapes, different renderers. The web one uses HTML+Tailwind+React; the cli one uses Ink. Currently 4 component pairs (TodoList, ApprovalPanel, DiffView, CitationPopover). |
| (new) `agentic-loop-on-primitives` | first sighting → **watch** | The pattern of building an agent loop on `streamText` + `stopWhen: stepCountIs(N)` instead of using a heavier framework. Surfaced when adding Vercel AI SDK as a harness — it's the differentiator. Belongs in a future framework primitive that documents the pattern. |

## Next exercises that would inform extraction

Patterns that appeared once need a 2nd or 3rd sighting before they're stable enough to extract. Exercises that would help:

- **A pricing-research desktop agent** (Electron + web scraping via firecrawl + research workflow) — would re-test `electron-three-pane-workspace`, possibly `approval-bridge` (if scraping needs approval), possibly `rooted-fs` (if research output is filesystem-bound). Same shape as wiki-agent — limited new signal.
- **A B2B SaaS API agent** (Hono + tool calls + no UI) — different interface; would NOT exercise the same primitives. Useful for triangulating which patterns are wiki-specific vs general.
- **A multi-channel bot** (Slack + Discord + scheduling) — different again; would NOT exercise three-pane or HITL. Would surface NEW patterns (channel routing, schedule-trigger agent invocation).

Triangulation rule: a pattern needs to recur **across different interface shapes** to be considered generally useful, not just shape-specific.

## Process

When a research exercise completes:

1. Add a `### Candidates from <exercise-name>` section if new
2. For each new pattern: add a row to the ledger with status `watch` and link to the source file in the exercise
3. For each pre-existing candidate that re-appeared: bump its status to `drifting` (if shape changed) or `stable` (if shape held), update LOC/notes
4. Check the extraction trigger — flip status to `soon` if any pattern meets criteria
5. Update the "next exercises" section with what new signal would help

When a pattern hits `soon`:

1. Decide name and API surface (write a short design doc)
2. Build the package — either inside the skill (`references/patterns/<name>/`) for "internal patterns" or as a standalone repo (`@forge/<name>`) for "external patterns"
3. Update affected starters / snippets to use the package
4. Update ledger entry to `extracted`, link to the package
5. Update PATTERN_LEDGER's process notes if anything was learned about the extraction itself
