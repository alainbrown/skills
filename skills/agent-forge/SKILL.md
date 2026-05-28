---
name: agent-forge
description: >
  Build a working TypeScript agent application by picking a permissive-licensed harness
  (Vercel AI SDK, OpenAI Agents SDK, LangGraph, Mastra for Track A library import; OpenCode
  or OpenClaw for Track B fork-and-strip) and customizing a vendored starter project for the
  user's purpose. Cascading interview: capabilities → harness → interface (CLI / web /
  Electron / API) → tools + MCP → agent UX policy → mock-iterate (visual mock of the
  interface that the user reviews and iterates on before any code is written) → generate →
  eval (three levels: build smoke, behavior via subagent-as-LLM grader, optional real-model
  spot-check). Produces a runnable project by copying a complete interface starter and
  dropping in a harness snippet, then customizing — not by generating from scratch. TypeScript-only as of
  iter-3 (Python was supported earlier; users who need Python should pick a different skill
  or framework). Use when the user wants to build an agent, create an AI assistant, set up
  a coding agent, build a bot, or describes any task that needs an autonomous agent.
  Triggers on "build an agent", "create a bot", "make an assistant", "I need an agent
  that...", "set up an AI agent for X".
---

# Agent Forge

<purpose>
Help users build a working agent application by either (Track A) importing a curated agent
framework and writing the app on top, or (Track B) forking a capable open-source agent and
stripping it down to what the user needs. Interview cascading from capabilities → harness →
interface → tools → UX. Produce a runnable starter where the agent loop, tools, LLM, and
streaming chat all work end-to-end for one developer running it locally.
</purpose>

<core_principle>
**Durable state via `.forge-state.json`.** Survives context compression and is the single source
of truth for the build phase.

- **Write after every stage decision.** Update before moving to the next stage.
- **Read before each stage.** Refresh context, especially after compression.
- **Surface cascading invalidation explicitly.** When a later answer contradicts an earlier
  decision (e.g., user picks `mastra` then says "must be pure Python only"), tell the user
  before silently reshuffling. Re-interview the affected stage.
- **Delete after the produced project boots successfully.**

Schema: `references/state-schema.md`. Key fields: `phase`, `agent` (name, description,
systemPrompt), `context` (intent, audience, style), `capabilities`, `harness` (track, name,
forkSubsystems for Track B), `interface`, `tools`, `ux` (errorPolicy, streaming, persistence),
`project` (path, language, packageManager), `decisions`, `cascadeChanges`.
</core_principle>

## Track A vs Track B

```
Track A — Library Import           Track B — Fork & Strip
──────────────────────────         ──────────────────────────
Your project starts from a         Your project = forked source +
vendored interface starter         customizations, framework code
(cli-ts / web-ts / electron-ts).   lives inside your project.
The skill drops in a harness
snippet at the placeholder spot.   You inherit a complete agent,
You get a working chat + streaming remove what you don't need,
UI for free.                       modify what you do.

Frameworks:                        Agents:
- Vercel AI SDK (primitives)       - OpenCode (TS coding agent)
- OpenAI Agents SDK                - OpenClaw (TS personal
- LangGraph                          assistant — 21 channels,
- Mastra                             voice, companion apps)

All TypeScript, all permissive     All TypeScript, all permissive
licenses.                          licenses.
```

Track A produces leaner projects with framework upgrades for free. Track B is faster to
"production-shaped" if the base agent is close to what the user wants — but the user owns the
upgrade path and the strip-down decisions.

## References

| File | Purpose | Loaded when |
|------|---------|-------------|
| `references/state-schema.md` | `.forge-state.json` field reference + example | After scaffolding |
| `references/cascade-logic.md` | Declared deps — per-harness `provides`/`lacks` + per-capability `requires`/`conflicts-with`. The LLM walks the graph to find satisfying harnesses and surface conflicts (replaces the earlier rule-table approach, which was eval-contaminated and incomplete). | Stage 2 (harness selection); re-walked when later stages add capabilities |
| `references/harness-profiles/<name>.md` | One file per harness: language, install, agent-loop API, tool API, MCP support, streaming, fork-vs-wrap shape, subsystem list | Stage 2 once shortlisted; Stage 6 for snippet drop-in |
| `references/interface-starters/<cli-ts\|web-ts\|electron-ts\|api-ts>/` | **COMPLETE BOOTABLE PROJECTS** — the skill copies the entire directory to the project location. Each has a placeholder `agent.ts` with BEGIN/END markers for harness snippet drop-in. | Stage 6 (generation — copy step) |
| `references/harness-snippets/<harness>-ts.ts` | Per-harness agent wiring (~100-250 lines) that drops into a starter's placeholder. ONLY exports `streamAgent` (and re-exports `AgentEvent`) — the starter's REPL/UI/IPC stays unchanged. | Stage 6 (generation — drop-in step) |
| `references/interfaces/<cli\|web\|electron>.md` | Per-interface CONCEPTUAL guidance: streaming protocol, signal handling, anti-patterns. Read for context when customizing the starter beyond a simple snippet drop-in. | Stage 3, Stage 6 (read for guidance only — the starter has the canonical implementation) |
| `references/fork-vs-wrap.md` | How to wrap (Track A — uses starter + snippet) vs fork (Track B — clones harness repo, strips subsystems) | Stage 6 generation |
| `references/common-tools/README.md` | Decision guide for the common-tools layer (bespoke vs framework); per-harness adaptation notes | Stage 4 (tools selection) |
| `references/common-tools/<ts\|py>/<tool>.{ts,py}` | Bespoke tool implementations: bash, file_read, file_write, file_edit, glob, grep, web_fetch. ~80 LOC each + tests. | Stage 4, Stage 6 (drop into project) |
| `references/common-tools/web-search.md` | Provider snippets (Brave / Exa / Tavily / Google CSE) for web search | Stage 4 (if user wants web search) |
| `references/mocks/<web\|electron\|api\|cli>/SCHEMA.md` | Per-interface mock contract — required states/operations, element checklist, customization points | Stage 5.5 (mock — read the matching one) |
| `references/mocks/<web\|electron\|api\|cli>/starter/` | Per-interface mock starter — `index.html` + `mock-data.js` (web/electron), `openapi.yaml` + `swagger.html` (api), `transcripts.md` (cli). Self-contained; runs via `npx serve` or opens in editor. | Stage 5.5 (copy into scratch dir, customize, iterate) |
| `references/tool-test-schema.md` | Exhaustive test spec format; stateless vs integration handling | Stage 6 generation |
| `references/verification.md` | First-run smoke test + tool tests; how to report pass/skip/fail | Stage 7 eval — smoke level |
| `references/eval-templates/` | Canonical evals/ scaffolding the skill copies into each produced project: baseline YAML scenarios, rubric, run-behavior.md plan, run-smoke.sh, run-real-model.ts, package.json snippet | Stage 7 eval (copy + customize + run) |

## Architecture (the produced project)

```
Produced Agent Project
├── agent core               ← from harness (imported in Track A; vendored in Track B)
│   ├── loop                 ← ReAct, tool calling, retry, streaming
│   ├── system prompt        ← drafted in Stage 1, finalized in Stage 5
│   └── model integration    ← provider config from Stage 1 + Stage 5
├── tools
│   ├── builtin (kept)       ← Track B only — subset of the forked agent's tools
│   ├── MCP servers          ← configured per agent
│   └── bespoke tools        ← rare, project-specific
├── interface                ← thin wrapper around agent core
│   ├── CLI                  ← readline + stdout streaming
│   ├── Web (Next.js)        ← API route + SSE + React streaming UI
│   └── Electron             ← main+renderer + IPC streaming
├── tests
│   ├── tool tests           ← exhaustive for stateless; skip-with-message for integration
│   └── smoke test           ← assert agent boots, calls tool X, streams output
├── mocks/                   ← approved Stage 5.5 mock (web/electron: index.html;
│                              cli: transcripts.md; api: swagger.html). Design spec.
├── openapi.yaml             ← api interface only — production contract from Stage 5.5
├── evals/                   ← Stage 7 quality bar — re-runnable as the agent evolves
│   ├── scenarios/baseline/  ← canonical scenarios filtered by applicability
│   ├── scenarios/project/   ← scenarios generated from state.context (2-3 per project)
│   ├── rubric.md            ← grader subagent contract
│   ├── run-smoke.sh         ← install/typecheck/test/boot
│   ├── run-behavior.md      ← plan for Claude Code subagent
│   ├── run-real-model.ts    ← optional, needs API key
│   └── results/             ← jsonl per run; compare over time
├── .env.example             ← required keys; fail loudly at runtime if missing
└── README.md                ← what it is, how to run, how to extend, what's wired
```

<process>

<step name="route">
**Confirm intent and pick mode.**

Read `.forge-state.json` if it exists (resuming a prior session). Otherwise create it with
`phase: "capabilities"`.

If the user's request is ambiguous between "build a new agent" and "modify an existing agent
project," ask. This skill builds new projects — for modifying existing ones, suggest the user
describe what they want changed instead.

Pick mode:
- **Interactive** (default): step through each stage with questions and explicit confirmations
- **Auto**: use recommended defaults at each stage, batch confirmation once at the end

Store mode in state. In auto mode, still surface cascading invalidation.

▶ Next: `capabilities`
</step>

<step name="capabilities">
**Establish what the agent needs to do. This drives every later stage.**

Ask in one batch (multi-select where appropriate):

1. **Domain** — coding / general / data / creative / customer-support / other (single)
2. **Interactivity** — interactive chat / batch (one-shot) / background (long-running) (single)
3. **Channels** — CLI / web chat / Electron desktop / Slack / Discord / Telegram / email (multi)
4. **Multi-agent** — does it need subagents or agent-to-agent handoffs? (yes/no)
5. **Modalities** — vision / voice / file uploads / none (multi)
6. **Scheduling** — does it run on a cron or trigger? (yes/no)
7. **Language preference** — TypeScript only (this skill is TS-only as of iter-3; surface and offer to switch language if user wants Python/Go/other)
8. **Provider flexibility** — locked to one provider / must swap providers / OpenAI-compatible / undecided (single)
9. **MCP** — must integrate with MCP servers? (yes / nice-to-have / no)

Capture freeform context too:
- What does the agent do in one sentence?
- Who uses it?
- What tone / persona?
- Any deal-breakers (must run offline, must be self-hostable, etc.)?

Write all answers to `state.capabilities` and `state.context`. Draft a working agent name and
one-line description; user can revise later.

▶ Next: `harness`
</step>

<step name="harness">
**Recommend a harness and the track. This is where the cascade gets real.**

Read `references/cascade-logic.md` for declared dependencies: per-harness `provides`/`lacks` and per-capability `requires`/`conflicts-with`. Recommendation is computed at runtime by walking this graph against the user's stated capabilities — NOT by consulting an enumerated rule table.

**Decision flow:**

1. **Apply hard filters.** Drop harnesses that fail language (`ts` required) or license (MIT / Apache-2.0 required). 6 shortlisted harnesses currently pass.
2. **Walk the dep graph.** For each capability extracted in Stage 1, find harnesses whose `provides` satisfies the capability's `requires`. Eliminate harnesses whose `lacks` intersects with required features.
3. **Surface conflicts-with eagerly.** If any capability's `conflicts-with` matches a current choice (e.g., `HITL` conflicts with `interface == api`), raise the cascade prompt now — don't wait until later stages.
4. **Recommend the intersection set with tie-breakers from the brief.** Multiple harnesses may survive — that's fine. Present them with the specific brief signals that break the tie ("user said 'minimal abstraction' → favors vercel-ai-sdk"). When the brief is silent on the discriminating signal, ASK the user; do not pick arbitrarily.
5. **Let user override.** If user picks a harness that fails the dep graph (e.g., explicit pick of mastra with voice-realtime in scope), surface the unmet dep and ask.

The LLM is trusted to derive transitive consequences from the declared deps. If `HITL` requires `pause-resume-mechanism` and only mastra provides it among Track A, the LLM should land on mastra without needing an enumerated "Slack bot → openai-agents-sdk"-style worked example. See `cascade-logic.md`'s four one-shot example walks for the SHAPE of the walk (those examples are deliberately NOT in the eval test suite).

**Track A → wrap pattern.** Output project structure: `package.json` + `src/agent.ts` (imports
framework) + `src/tools/*` + `src/interface/*`.

**Track B → fork pattern.** Show the harness's subsystems as a paginated checklist. Example
for OpenCode (18 built-in tools, MCP client, LSP, 75+ providers — read the full inventory from
`references/harness-profiles/opencode.md`):

```
OpenCode brings the following subsystems. Check what to keep:

  Core (required — can't strip)
  [✓] agent core (loop + tool calling + message threading)

  Optional (each independently strippable)
  [✓] mcp-client                        (recommended unless no MCP needed)
  [ ] tui                               (heavy — strip if building non-CLI interface)
  [ ] lsp                               (Language Server Protocol context)
  [ ] multi-session                     (concurrent agent sessions)
  [ ] autocompact                       (auto-compaction of long contexts)
  [ ] undo-redo                         (file operation undo/redo)
  [ ] permissions                       (tool permission prompts — recommended)

  Built-in tools (18 — uncheck to remove)
  [✓] bash, read, write, edit           (always kept)
  [ ] glob, grep, web-fetch, ...        (pick the rest)

  Providers (75+ — pick a subset)
  [✓] anthropic
  [ ] openai, vercel, openrouter, google, bedrock, azure, ...
```

**OpenClaw uses the same pattern but is significantly denser** — 136 plugins across 21
channels + 57 LLM provider extensions + 58 bundled skills. The checklist MUST be paginated
in pages of ~10-15 items so the user can navigate. See `harness-profiles/openclaw.md` for the
full inventory; example pagination:

```
OpenClaw subsystem checklist — page 1/8 (Channels)

  Messaging channels (pick the ones you need)
  [ ] whatsapp        [ ] telegram      [ ] slack
  [ ] discord         [ ] signal        [ ] imessage
  [ ] msteams         [ ] matrix        [ ] feishu
  [ ] line            [ ] mattermost    [ ] nextcloud-talk
  [ ] nostr           [ ] synology-chat [ ] tlon
  [ ] twitch          [ ] zalo          [ ] zalouser
  [ ] qqbot           [ ] googlechat    [ ] irc

  [next: page 2/8 — LLM providers] [skip to summary]
```

Store kept/discarded subsystems in `state.harness.forkSubsystems`. The generation stage uses this
list to vendor only the kept code.

**Cascading invalidation.** When a later stage adds a capability, re-walk the dep graph. If the new capability's `requires` isn't satisfied by the chosen harness's `provides`, OR its `conflicts-with` matches a current choice, surface the cascade prompt and re-interview. The LLM derives this transitively from the declared deps — no enumeration needed. Don't silently switch.

▶ Next: `interface`
</step>

<step name="interface">
**Pick the primary interface and any secondary interfaces.**

Read `references/interfaces/<cli|web|electron|api>.md` for the harness-compatible options.

**Filter by harness.** Some interfaces are nearly free for some harnesses and expensive for
others:

| Harness | CLI | Web (Next.js) | Electron | API (Hono) |
|---------|-----|---------------|----------|------------|
| Vercel AI SDK | trivial | trivial | medium | trivial (Vercel AI SDK is API-native) |
| OpenAI Agents SDK | trivial | easy (Agents SDK web protocol) | medium | trivial |
| LangGraph | trivial | easy (LangGraph platform) | medium | easy |
| Mastra | trivial | trivial (Mastra has built-in playground) | medium | easy (Mastra ships a Hono server) |
| OpenCode (Track B) | already CLI | medium (wrap TUI in pty.js or rewrite UI) | medium | medium (re-expose CLI via Hono routes) |
| OpenClaw (Track B) | already CLI | easy (canvas hosted via Gateway HTTP) | trivial (companion apps already exist for macOS/iOS/Android) | easy (Gateway is already an HTTP server — just expose under different routes) |

If the user's interface choice is "hard" for the chosen harness, surface the cost. Options:
(a) accept the cost, (b) switch interface, (c) switch harness — re-interview if (c).

**Multi-interface.** Many projects benefit from both CLI (for the developer) and web (for
end users). Mention this if it's cheap.

Store choice(s) in `state.interface`. Note: for Track B, the harness's built-in CLI/TUI is
typically the default — picking web or Electron means writing a new interface that calls the
harness's agent API.

▶ Next: `tools`
</step>

<step name="tools">
**Decide what tools the agent has access to.**

Three sub-questions, asked in this order:

**1. Common tools layer** — does the chosen harness ship general bash/file/web tools?

Check `references/common-tools/README.md` for the per-harness table. If the harness DOES ship them
(opencode Track B), the built-ins cover the basics — skip to (2).

If the harness does NOT ship them (openai-agents-sdk, langgraph, mastra, vercel-ai-sdk —
all Track A), ask the user:

```
Tool kit approach?

  [a] Coding agent       bash · file-read · file-write · file-edit · multi-edit · glob · grep
                         For agents that touch the user's codebase.

  [b] Research agent     file-read · file-write · web-fetch · todo-write
                         For agents that gather info from the web and synthesize.
                         (You'll be asked separately about a web search provider.)

  [c] Minimal            bash · file-read · file-write
                         Smallest reasonable surface for simple agents.

  [d] Framework          vercel-labs/just-bash + bash-tool
                         Simulated in-memory bash, virtual FS, allow-listed network.
                         Strong isolation; Vercel-maintained; ~thousands of LOC behind
                         one import.

  [e] Custom             Start from empty, pick individual tools below.

After choosing a bundle, you can fine-tune the selection — every individual tool is
listed with a checkbox, pre-checked based on the bundle:

  ✓ bash          ✓ file-read     ✓ file-write
  ✓ file-edit     ✓ multi-edit    ☐ glob
  ☐ grep          ☐ web-fetch     ☐ todo-write
```

In bundle modes [a]-[c], the skill copies the bundled tools (and any user-added
individual tools) from `references/common-tools/ts/` into the project's `src/tools/custom/`
along with each tool's test file, and wires registration into the agent's tool list.

In framework mode [d], the skill adds `just-bash` + `bash-tool` to the project's deps
and imports `bash`, `readFile`, `writeFile` from `bash-tool` in the agent config.

**Pairing rule: `todo-write` always co-includes the matching UI component.** If the user
picks `todo-write` (typically in [b] Research agent) AND the interface is `web-ts` or
`electron-ts`, the skill also copies `references/ui-components/web/TodoList.tsx` into the
project's components directory. For `cli-ts`, it copies `references/ui-components/cli/TodoList.tsx`
instead. The tool persists `.agent-todos.json`; the UI watches it. Without the UI the tool
still works but the user can't see the todo list as the agent updates it.

**2. MCP servers** — for each, ask: which servers does this agent need?

Standard candidates by domain:
- Coding: filesystem MCP, github MCP, git MCP, code-search MCP
- General: fetch MCP, memory MCP
- Data: database MCP (postgres / sqlite), s3 MCP
- Productivity: gmail MCP, calendar MCP, slack MCP, notion MCP

Skip if the user's earlier capability answer was `mcp: no`.

**3. Web search** — separate from the common-tools layer because every reliable option
requires an API key.

Ask: "Will the agent need to search the web (not just fetch known URLs)?"

If yes, present the provider matrix from `references/common-tools/web-search.md`:
- Brave Search (free 2k req/mo; best quality-per-dollar) — DEFAULT
- Exa (neural search; good for finding sources)
- Tavily (agent-shaped — includes AI-generated answer)
- Google CSE (familiar, limited free tier)

The skill drops the matching snippet into `tools/custom/web_search.ts` and adds the
required env var to `.env.example`.

**4. UI components** — beyond the tool-bundled `TodoList`, some agent designs benefit
from additional vendored UI components:

- **`ApprovalPanel`** — pairs with HITL. **Auto-included** whenever any tool the agent uses
  is marked for approval (Mastra `requireApproval`, or any harness's equivalent). Skill
  doesn't ask — it just includes it.
- **`DiffView`** — useful for ApprovalPanel's `renderToolPreview` callback when the tool
  is an edit (e.g., `file-edit`, `multi-edit`). Auto-included alongside ApprovalPanel.
- **`CitationPopover`** — for research/wiki agents whose responses include `[N]` citations.
  Ask: "Will the agent emit citations like `[1]`, `[2]` linked to sources?" Yes → include.

Each component drops in from `references/ui-components/web/` (for web-ts and electron-ts
interfaces) or `references/ui-components/cli/` (for cli-ts). Same props on both sides;
the rendering differs.

**5. Bespoke project-specific tools** — only when none of the above cover the need.
Tell the user this is rare and ask: "What can't bash + MCP + web search do?" If the answer
is generic, push back.

**Cascading invalidation.** If user adds a tool that requires capability the harness lacks
(e.g., custom tool requires a runtime the harness can't host), surface and revisit.

Store choices in `state.tools`. For each MCP server, record name, purpose, and required env vars.
For bespoke common-tools, record which tools were picked. For web search, record the provider
and required env var.

▶ Next: `ux`
</step>

<step name="ux">
**User-controlled agent UX policy. The skill is opinionated about implementation, NOT about UX.**

Default to fail-fast. Ask the user per category — they decide:

1. **Tool failure** — fail-fast (raise, stop the turn) or log-and-continue (return error to LLM, let it retry)?
   Default: fail-fast. Recommend log-and-continue for tools with idempotent retries (e.g., search).
2. **LLM API failure** — fail-fast or retry-with-backoff (3 attempts) or fallback to a cheaper model?
   Default: fail-fast. Most users want retry-with-backoff for transient errors.
3. **Rate limit** — fail-fast or wait-and-retry?
   Default: wait-and-retry with respect to Retry-After header.
4. **Streaming** — token-by-token / message-level / none? Default: token-by-token for chat interfaces.
5. **Persistence** — none / sqlite (single-user, local) / disk-JSON? Default: none unless interactive
   chat → sqlite.

Also finalize the system prompt. Show the draft from Stage 1 alongside captured persona/style/intent.
User can edit inline.

Store in `state.ux`. The generation stage wires these policies into the agent code.

▶ Next: `mock`
</step>

<step name="mock">
**Produce a visual mock of the chosen interface BEFORE generating code. User reviews and iterates; once approved, the mock becomes the spec for Stage 6.**

Read `references/mocks/<interface>/SCHEMA.md` for the per-interface contract. Each interface ships a SCHEMA + a `starter/` directory the skill copies and customizes:

| Interface | Mock format | View via | Approved artifact ships at |
|-----------|-------------|----------|----------------------------|
| web       | HTML+Tailwind, 5-state toggle (default · empty · streaming · approval · error) | `npx serve` in scratch dir → open http://localhost:3000 | `<project>/mocks/index.html` |
| electron  | HTML+Tailwind with desktop chrome, 5 states + layout toggle (single-pane / three-pane) | `npx serve` in scratch dir | `<project>/mocks/index.html` |
| api       | OpenAPI 3.1 spec + Swagger UI viewer page | `npx serve` → open `/swagger.html` | `<project>/openapi.yaml` (production contract) + `<project>/mocks/swagger.html` |
| cli       | Markdown transcripts of named scenarios (welcome / default / streaming / approval / error) | open in editor; optionally `npx serve` | `<project>/mocks/transcripts.md` |

**Loop:**

1. **Scaffold.** Copy `references/mocks/<interface>/starter/` to `<project>/.forge-mock/`. Customize from state:
   - `state.context` → agent name, persona shown in welcome state, tone reflected in sample messages
   - `state.tools` → tool names in mock tool-calls; the `approval` state and `ApprovalPanel` references only included when at least one tool has HITL; `CitationPopover` only included when the agent emits citations; `TodoList` only included when `todo-write` is in the tool set
   - `state.ux.streaming` → if `none`, drop the streaming state; otherwise include it
   - For electron: layout toggle defaults to single-pane unless `state.tools` includes file/wiki tools or the user's design implies a workspace (then default to three-pane)
2. **Serve.** For web/electron/api: spawn `npx serve <scratch>` as a background process, log PID to `state.mock.serverPid`, and tell the user the URL. For cli: tell the user the path to open in their editor.
3. **Wait for feedback.** Prompt: "Open the mock and review. What would you like to change? Say `approve` when the design is right." Each round of feedback appends to `state.mock.iterations` with the user's note and which files you edited.
4. **Apply edits surgically.** Don't regenerate from scratch — same principle as Stage 6. Edit `index.html` / `openapi.yaml` / `transcripts.md` in place. The user refreshes the browser/editor and re-reviews.
5. **Approve and lock.** When the user approves, set `state.mock.approved = true`, kill the `npx serve` background process via `state.mock.serverPid` (then clear the field), and leave the scratch dir intact — Stage 6 reads it.

**Fidelity to the produced project:**
- The mock's element shapes (chat layout, ApprovalPanel placement, CitationPopover style, error toast position) ARE what the produced project's UI components will render. Stage 6 customization keeps those shapes.
- For api: the OpenAPI spec IS the production contract. Hono routes in the api-ts starter are generated/annotated to match `operationId`s in the spec.
- For cli: `transcripts.md` is a spec for both Stage 6 (system prompt + tool integration) and Stage 7 evals (transcripts become baseline behavioral expectations).

**Skippable.** If the user says "skip the mock" or "just build it," set `state.mock.skipped = true` and proceed to Stage 6 with default visual choices. Log the skip in `state.decisions`.

**Cascading invalidation.** If mock review surfaces a need that conflicts with an earlier stage — e.g., user asks for a sidebar file tree in the electron mock but didn't mention file ops in Stage 4 — surface in the standard `Heads up — your latest answer changes the recommendation` format and re-interview the affected stage.

▶ Next: `generate`
</step>

<step name="generate">
**Produce the project by copying a starter and customizing it. The skill almost never writes from scratch.**

Before generating, lock in `state.project.path` (where the project goes — ask user if not yet
decided; default to `<cwd>/<agent-name>/`).

**Mock-driven generation.** If `state.mock.approved` is true, the scratch dir at `state.mock.scratchDir`
is the visual/contract spec. After Step 1 (copy starter):
- Move/rename `state.mock.scratchDir` to `<project>/mocks/`.
- For api: also copy `<project>/mocks/openapi.yaml` to `<project>/openapi.yaml` — that's the
  production contract. Annotate the Hono routes with the matching `operationId`s.
- For web/electron: the produced project's UI components (chat layout, ApprovalPanel, etc.) should
  match the shapes shown in the approved mock. Stage 6 customization preserves those shapes.
- For cli: the system prompt in Stage 6 should produce outputs consistent with the approved
  transcripts. The transcripts also become input to Stage 7 evals.

If `state.mock.skipped` is true, generation proceeds with default visual choices and no `mocks/`
directory is produced.

## Track A — copy starter + drop snippet + customize

This is the dominant case. Track A produces a project by:

1. **Copy the interface starter** to `state.project.path/`. The mapping:
   - cli → `cp -r references/interface-starters/cli-ts/ <project>/`
   - web → `references/interface-starters/web-ts/`
   - electron → `references/interface-starters/electron-ts/`
   - api → `references/interface-starters/api-ts/`

2. **Drop in the harness snippet.** Replace the starter's placeholder `agent.ts` block
   (between the `// === BEGIN AGENT WIRING ===` / `// === END AGENT WIRING ===` markers) with
   the content of `references/harness-snippets/<harness>-ts.ts`. The snippet only re-exports
   `streamAgent` (+ `AgentEvent`) — the starter's REPL/UI/IPC keeps working.

3. **Wire tools.** Append to the starter's `tools/mcp-config.ts` registry. Each MCP server
   in `state.tools.mcpServers` adds an entry: `{ name, package, command, args, envVars }`. For
   bespoke tools, add a file under `tools/custom/<name>.ts` following the harness's tool
   signature (see harness profile).

4. **Customize the system prompt.** Replace the starter's `prompt.ts` template with one
   that reflects `state.agent.systemPrompt` (which itself reflects `state.context.style`,
   `audience`, `intent`). NEVER ship "You are a helpful AI assistant."

5. **Apply UX policy.** The starter has hooks for error policy, streaming, persistence. Read
   `state.ux` and set the corresponding config values (look for `// SKILL: configure from
   state.ux` comments in the starter — these mark insertion points).

6. **Update `.env.example`.** The starter has `# Harness keys go here (filled in by skill
   generation)`. Replace with the actual keys the chosen harness + MCP servers need
   (from the harness profile's "Required env" + each `mcpServers[].envVars`).

7. **Update `package.json`.** Add the harness's package, the snippet's imports' packages, the
   MCP server packages, and any bespoke tool deps.

8. **Customize the README.** The starter has a templated README — fill in agent name,
   description, what's wired, how to run, env vars, what's tested.

9. **Update test fixtures.** The starter ships placeholder tests; extend them with:
   - Smoke test that asserts the agent boots and calls at least one tool
   - Per-tool tests following `references/tool-test-schema.md` (exhaustive stateless +
     skip-with-message integration)

## Track B — fork harness + customize on top

For `opencode` (coding agent) or `openclaw` (personal assistant / multi-channel).

1. **Clone the harness repo** at the pinned SHA from the harness profile to `state.project.path/`.
2. **Strip discarded subsystems** per `state.harness.forkSubsystems.discarded`. For each, find
   the relevant source paths in the harness profile's subsystem inventory and remove. Patch any
   kept module that imports a discarded one (the harness profile lists known cross-subsystem
   leaks — handle them per the guidance there).
3. **Apply harness-specific hazards** per `references/fork-vs-wrap.md` (e.g., for OpenCode prefer
   in-place edits to `prompt/*.txt` + `tool/registry.ts` over deep vendoring; for Hermes the cron
   tick lives in the gateway thread).
4. **Customize system prompt** by editing the harness's prompt file (path varies — see profile).
5. **Add bespoke tools** via the harness's tool registration mechanism.
6. **Write `FORK_NOTES.md`** with pinned SHA, kept-vs-discarded list, modifications, and upstream
   cherry-pick path.

## Delegation strategy

Both tracks benefit from subagent parallelization. For Track A:

| Subagent | Reads | Writes |
|----------|-------|--------|
| **Copy & wire** | state, `harness-snippets/<harness>.{ts,py}` | Project directory (cp starter), replace agent.{ts,py}, wire tools registry, update manifest + .env.example |
| **Prompt & UX** | state, `harness-profiles/<harness>.md` | Customize `prompt.{ts,py}`, apply UX policy at SKILL-marked insertion points |
| **Tests** | state, `tool-test-schema.md`, harness profile | Extend starter's test files with smoke test + per-tool tests |
| **README** | state, project directory (read for what's wired) | Customize README |

For Track B: skip "Copy & wire" (instead: clone + strip), keep the rest.

**Every subagent must:**
- Read the state file first
- Reference the harness profile for exact API signatures (DON'T guess)
- Match package manager from `state.project.packageManager`
- Add `// TODO: verify` if it falls back on uncertain API patterns
- Use the starter's existing patterns (don't introduce new conventions)

▶ Next: `eval`
</step>

<step name="eval">
**Validate the produced agent at three levels: build correctness (smoke), design correctness (behavior), and model correctness (real-model spot-check).**

Read `references/eval-templates/README.md` for the canonical structure. Stage 7 has two halves:

**Half 1 — scaffold the evals/ directory in the produced project.**

1. Copy `references/eval-templates/` to `<project>/evals/`.
2. Add the `package.json.snippet` entries to `<project>/package.json` (`pnpm eval`, `pnpm eval:smoke`, `pnpm eval:behavior`, `pnpm eval:real`).
3. Filter `scenarios/baseline/` by `applicability`: drop scenarios whose conditions don't hold (e.g., drop `06-hitl-approve.yaml` if no HITL tools; drop `05-streaming.yaml` if `state.ux.streaming == "none"`).
4. Generate 2-3 **project-specific** scenarios under `scenarios/project/` from `state.context.userSummary`, `state.tools`, and the agent's intended workflows. Each should test a load-bearing behavior the user actually cares about — typically a "happy path the agent must handle" + an "edge case the agent must NOT confuse for the happy path" + (when relevant) a "load-bearing convention" scenario (e.g., for an agent with HITL writes, a scenario that the agent never bypasses HITL via a generic file-write tool). Use the baseline YAML schema. Stay agnostic to scenario names from past evals.
5. For interfaces with mocks (Stage 5.5), wire the approved cli `transcripts.md` and / or web/electron states as fixture data for relevant scenarios — the transcript is a baseline behavioral expectation.

**Half 2 — run the three levels.**

1. **Smoke (always).** Run `bash evals/run-smoke.sh`. Runs `pnpm install` (with --frozen-lockfile if a lockfile exists), `pnpm typecheck`, `pnpm test`, and a 30s boot smoke that invokes the agent with a canned prompt and asserts a non-empty response. If a required API key isn't set, the boot smoke marks as "requires <KEY> — skipped" rather than failing.
2. **Behavior (primary signal — no API key needed).** Drive `evals/run-behavior.md` as a plan: for each scenario, launch a grader subagent with the agent's design (system prompt, tool list, UX policy) + the scenario input + bias-control instruction (commit to a trace before reading the rubric). Capture trace + score. Append to `evals/results/<ISO-timestamp>.jsonl`.
3. **Real-model spot-check (optional, expensive).** If user has `ANTHROPIC_API_KEY` set (or the harness's provider key), run `pnpm eval:real` — picks scenarios tagged `real-model: true`, runs them through the real model with the actual system prompt + tools, compares to the simulated trace. Reports drift between simulation and reality.

Report a one-screen summary: per-level pass/skip/fail counts; top 3 failing criteria across behavior scenarios with the design lever they implicate (system prompt? tool list? UX policy?); link to the latest results jsonl.

**Failure handling.** If behavior shows persistent failures (>30% of scenarios fail the same criterion), return to the implicated stage (e.g., Stage 5 if it's a UX-policy issue, Stage 4 if it's a tool wiring issue) and re-interview. Don't silently patch — the cascade exists so the user owns these decisions.

▶ Next: `done`

▶ Next: `done`
</step>

<step name="done">
**Wrap up.**

- Print final summary: harness + track, interface(s), tools, where the project lives, how to run.
- Delete `.forge-state.json` from the user's repo (not from skills repo — this is the produced
  project's state file).
- Suggest next steps the user might want: deploy config, auth, additional interfaces, more tools.
- Do not offer to commit the produced project unless asked — it's the user's repo.
</step>

</process>

<guardrails>
- NEVER skip the cascading invalidation surface. If a later answer contradicts an earlier
  decision, tell the user before reshuffling.
- NEVER pretend Track B fork-and-strip is trivial. Hermes has 40+ tools and 7 sandbox backends;
  OpenCode has LSP, MCP client, autocompact, 75+ providers. The user must see the subsystem list
  and check what to keep.
- NEVER write framework API patterns from memory if uncertain. The harness profiles are
  authoritative — read them. If still unsure, mark `// TODO: verify` and tell the user.
- NEVER ship a project that can't boot. The verify step is mandatory.
- NEVER decide agent UX policy for the user. Errors, streaming, persistence are user choices
  — ask explicitly. Default to fail-fast only when the user defers.
- NEVER include eval artifacts, secrets, or workspace files in the produced project.
- For all generated projects, use `pnpm` as the package manager (TS-only as of iter-3).
- The system prompt must reflect what the user actually said about persona/audience/style —
  not a generic "you are a helpful assistant."
</guardrails>

<success_criteria>
- [ ] `.forge-state.json` created and updated after every stage
- [ ] Capabilities captured with all 9 axes + freeform context
- [ ] Harness chosen with explicit reasoning, track recorded (A or B)
- [ ] For Track B, `forkSubsystems.kept` and `discarded` explicit
- [ ] Interface chosen with cost surfaced if "hard" for the harness
- [ ] Tools include any MCP servers + .env keys + bespoke tools (or none, justified)
- [ ] UX policy explicit per category (tool failure, LLM failure, rate limit, streaming, persistence)
- [ ] Mock reviewed and approved (or explicitly skipped) — `state.mock.approved` or `state.mock.skipped` is true; for non-skipped interfaces the `mocks/` dir ships in the produced project, and for api `openapi.yaml` is in the project root as the production contract
- [ ] Project generated by subagents with all files present and runnable
- [ ] `evals/` scaffolded with filtered baseline scenarios + 2-3 project-specific scenarios + rubric + runners + package.json scripts
- [ ] Eval smoke level passes (install + typecheck + test + boot)
- [ ] Eval behavior level run with grader subagent; results captured to `evals/results/<ISO>.jsonl`; failure analysis surfaced if >30% of scenarios fail any criterion
- [ ] Eval real-model spot-check run if user has API key, OR explicitly deferred
- [ ] README documents how to run, env vars, what's wired, what's stubbed
- [ ] Cascading invalidations surfaced (if any), not silently applied
- [ ] `.forge-state.json` deleted from produced project after successful eval
</success_criteria>
