---
name: agent-forge
description: >
  Create specialized TypeScript agents by composing AI SDK, Chat SDK, MCP tools, and bash-tool.
  Interactive wizard that interviews about the agent's purpose, drafts a system prompt, selects
  tools and MCP servers, picks an interface, and builds a working agent project. Use when the user
  wants to build an agent, create a bot, make an AI assistant, set up a coding agent, build a
  Slack/Discord/Telegram bot with AI, or describes any task that needs an autonomous agent.
  Triggers on "build an agent", "create a bot", "make an assistant", "I need an agent that...",
  "set up an AI agent for X", or any description of an autonomous AI task.
---

# Agent Forge

<purpose>
Help users create specialized TypeScript agents by composing AI SDK with bash-tool, MCP servers,
and targeted interfaces. Interview, recommend, and build — producing a working project the user
can `npm install && npm start` and immediately interact with.
</purpose>

<core_principle>
**Durable state via `agent-forge.json`.** This file survives context compression and drives the
build phase — it is the single source of truth for all decisions.

- **Write after every decision.** After any stage completes or choice changes, update the state file.
- **Read before each step.** Before presenting options or acting on a decision, read the file to
  refresh context — especially important after context compression.
- **Delete after building.** It has served its purpose.

Schema: See `references/state-schema.md` for the complete schema, field reference, and worked
example. Include: `phase`, `currentStage`, `docsTools`, `agent` (name, description, systemPrompt),
`context` (summary, intent, audience, style, futureConsiderations), `stages` (1-7 with decisions),
and `dependencies`.
</core_principle>

## Architecture

```
Agent Core (agent.ts)
  ├── bash-tool          — sandboxed shell, file I/O, text processing
  ├── MCP servers        — cloud providers, GitHub, Playwright, databases
  └── bespoke tools      — rare, domain-specific (follows integration pattern)
       ↑
       | agent.generate() / agent.stream()
       |
Interface Layer (thin wrappers — one or more)
  ├── CLI:      readline → agent.stream()          (~20 lines)
  ├── API:      HTTP POST → agent.stream()          (~25 lines)
  ├── Web chat: Next.js route → streamText + useChat (~4 files)
  └── Chat SDK: webhook → thread.post(textStream)   (~2 files)
```

Changing the interface never changes the agent logic. Multiple interfaces coexist in the same project.

## Tool Architecture

Every agent gets three layers of tools:

**1. bash-tool (always included)** — wraps `just-bash`, provides AI SDK-compatible tools via
`createBashTool()`. Covers shell execution, file I/O, grep, sed, awk, jq, curl. One import,
dozens of capabilities, sandboxed.

**2. MCP servers (configured per agent)** — rich integrations from the MCP ecosystem. Consult
`references/component-library.md` for the full recommendation tables.

**3. Bespoke native tools (rare)** — only for domain-specific operations that bash and MCP cannot
handle. Written following `references/integration-tool-pattern.ts`.

```
Can this be done with a bash command? → Yes → bash-tool handles it
                                       → No ↓
Is there an MCP server for this?       → Yes → configure the MCP server
                                       → No ↓
Is it a standard HTTP call?            → Yes → bash-tool (curl) or Fetch MCP
                                       → No ↓
Write a bespoke native tool
```

## References

- `references/state-schema.md` — `agent-forge.json` schema, field reference, worked example
- `references/component-library.md` — Decision tables: agent loops, interfaces, models, state, deployment, MCP recommendations
- `references/project-structures.md` — Directory layouts per interface, package scripts, deployment configs
- `references/cascade-logic.md` — Dependency graph, cascade rules, algorithm
- `references/integration-tool-pattern.ts` — Pattern for writing bespoke tools (credential check, not_configured fallback, integration point)

<process>

<!-- ═══════════════════════════════════════════ -->
<!-- DESIGN PHASE                               -->
<!-- ═══════════════════════════════════════════ -->

<step name="check_environment">
**Check for documentation tools before starting.**

Detect whether context7 or similar docs tools are available. Record in `agent-forge.json` under
`docsTools: true|false`. When available, use them to look up current AI SDK API signatures before
writing code.

▶ Next: `capture_purpose`
</step>

<step name="capture_purpose">
**Understand the agent's purpose, draft the system prompt, and name the agent.**

The system prompt IS the agent's application logic. Present one stage per response — stop and wait
for the user to respond after each. Do not combine stages. Do not infer approval.

### Understand the agent

Ask one question at a time (skip what is already known):
1. What should this agent do? What problem does it solve?
2. Who uses it? (developers, end users, internal team)
3. What should it be good at? What should it refuse or avoid?
4. Any constraints? (response length, tone, domain boundaries)

### Draft the system prompt

Write a complete system prompt — role, expertise, behavioral guidelines, output format, domain
knowledge. Present for review. Iterate until satisfied.

### Name the agent

Suggest a name (kebab-case). Let user override.

**Wait for explicit confirmation before advancing.**

▶ Next: `choose_interface`
</step>

<step name="choose_interface">
**Select the primary interface and any add-ons.**

Consult `references/component-library.md` for the interface recommendation table.

### Primary interface

| Agent audience | Recommended primary |
|----------------|---------------------|
| Developer tool | CLI |
| Internal team | Slack or Teams |
| Community-facing | Discord or Telegram |
| User-facing product | Web chat |
| Service/backend | API-only |
| Multiple audiences | Multi-platform (Chat SDK) |

### Add-ons

| Add-on | When to recommend |
|--------|-------------------|
| +CLI | Always for non-CLI primaries |
| +API | For Chat SDK agents and CLI agents needing remote access |

Ask via AskUserQuestion:
- header: "Interface"
- question: "Based on your agent's audience, I recommend [X]. Sound right?"
- options:
  - "Use recommended" — proceed with the recommendation
  - "Pick different" — choose a different primary interface
  - "Let me explain" — describe your setup

**Wait for explicit confirmation before advancing.**

▶ Next: `select_tools`
</step>

<step name="select_tools">
**Determine which tools the agent needs beyond bash-tool.**

bash-tool is always included. Determine:
- Which **MCP servers** the agent needs (recommend from `references/component-library.md`)
- Whether any **bespoke native tools** are needed (justify why bash/MCP cannot cover them)

Write specs for bespoke tools (if any) and record MCP server choices.

**Wait for explicit confirmation before advancing.**

▶ Next: `configure_remaining`
</step>

<step name="configure_remaining">
**Configure model, durability, state, and deployment (stages 4-7).**

These stages are often straightforward. If the user says "just pick sensible defaults" or
"proceed," present stages 4-7 together as a batch. Never batch stages 1-3.

### Model and configuration (stage 4)

Consult `references/component-library.md`. Configure model provider, `stopWhen`, and `prepareStep`.

### Durability (stage 5)

Most agents should be ephemeral (`ToolLoopAgent`). Only recommend durable for long-running tasks,
human-in-the-loop, or production SLA.

### State management (stage 6)

Key rule: Chat SDK requires Redis; durable agents require Postgres.

### Deployment (stage 7)

Auto-skip for CLI-only. Vercel for Next.js, Railway/Fly for others.

▶ Next: `confirm_design`
</step>

<step name="confirm_design">
**Show summary table and get build approval.**

```
Agent: [name]
Purpose: [one-line description]

| # | Stage      | Choice                     | Status |
|---|------------|---------------------------|--------|
| 1 | Purpose    | [summary]                 |   ✓    |
| 2 | Interface  | Slack + CLI (add-on)      |   ✓    |
| 3 | Tools      | bash + AWS MCP, 1 bespoke |   ✓    |
| 4 | Model      | Anthropic (top-tier)      |   ✓    |
| 5 | Durability | Ephemeral (ToolLoopAgent) |   ✓    |
| 6 | State      | Redis                     |   ✓    |
| 7 | Deployment | Vercel                    |   ✓    |

Ready to build?
```

Ask via AskUserQuestion:
- header: "Build?"
- question: "Design is complete. Ready to build the project?"
- options:
  - "Build it" — generate the project files
  - "Change something" — revisit a specific stage
  - "Let me explain" — other feedback

### Cascading invalidation

If the user wants to change a completed stage, consult `references/cascade-logic.md` for the
dependency graph and cascade rules. Key principles:
- Agent core is decoupled from infrastructure
- Add/remove CLI never cascades
- Model and State are leaf nodes
- When in doubt, ask

▶ Next: `build_core` (if approved) or back to the changed stage
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- BUILD PHASE                                -->
<!-- ═══════════════════════════════════════════ -->

<step name="build_core">
**Generate the agent core and tools using a subagent.**

Read `agent-forge.json` for all finalized decisions. If `docsTools` is true, subagents must look
up current AI SDK API signatures from documentation before writing code.

### Subagent 1: Agent Core + Tools (run first)

Generate based on `agent-forge.json`:

**`agent.ts`** (~15 lines):
- Import `ToolLoopAgent`, `stepCountIs` from `ai`
- Import model provider from stage 4 decision
- Import `createBashTool` from `bash-tool`
- Import native tools from `./tools` (if any bespoke tools exist)
- Call `await createBashTool()` to get bash tools
- If MCP servers chosen: import `connectMCPTools` from `./mcp`, call it, merge tools
- Create and export `ToolLoopAgent` with: model, `instructions` set to system prompt from
  `agent-forge.json`, merged tools, `stopWhen` from stage 4
- System prompt goes verbatim — do not modify it

**`mcp.ts`** (only if MCP servers chosen):
- Import `createMCPClient` from `@ai-sdk/mcp`
- Define MCP server configs from stage 3
- Export `connectMCPTools()` — connects to each server, merges tools, logs warnings for failures
- Export `closeMCPClients()` — shuts down all clients
- Handle connection failures gracefully — never crash

**`tools/index.ts`**:
- Import and re-export all bespoke native tools (if any)
- Export `nativeTools` record merging them all

**Bespoke tool files** (if any, following `references/integration-tool-pattern.ts`):
- Import `tool` from `ai`, `z` from `zod`
- Define Zod input schema with `.describe()` annotations
- Execute: check credentials → return `{ status: "not_configured", message, setup }` if missing
  → perform operation → return typed result
- Never `throw` on missing config. Never leave bare TODOs. Complete, working implementations.

**`tsconfig.json`**:
- CLI/API: target ES2022, Node16 module resolution, strict, `@/*` path alias
- Next.js: bundler resolution, JSX preserve, `next` plugin, `@/*` path alias

▶ Next: `build_interface`
</step>

<step name="build_interface">
**Generate the interface layer and package files using subagents.**

Run these two subagents in parallel (outputs are independent):

### Subagent 2: Interface Layer

Generate based on stage 2 decisions. Every interface imports the agent from `agent.ts`. See
`references/project-structures.md` for directory layouts per interface choice.

**CLI** (`src/cli.ts`, ~20 lines):
- readline loop, agent.stream(), write chunks to stdout
- Handle Ctrl+C gracefully. Print startup message with agent name.

**API** (`src/server.ts`, ~25 lines):
- Hono server, POST `/api/agent`, GET `/health`
- Start on `PORT` env var (default 3000)

**Web chat** (4 files):
- `src/app/api/chat/route.ts` — streamText with convertToModelMessages, maxDuration = 60
- `src/app/page.tsx` — useChat, dark-themed, agent-domain styling, 4 suggestion prompts
- `src/app/layout.tsx` — Geist fonts, dark mode
- `src/app/globals.css` — Tailwind, dark theme variables

**Chat SDK** (2 files per platform):
- `src/lib/bot.ts` — Chat instance with platform adapters + Redis state
- `src/app/api/bot/<platform>/route.ts` — webhook handler per platform

**`next.config.ts`** (if Next.js): mark Chat SDK packages as `serverExternalPackages`

### Subagent 3: Package, Deploy, README

**`package.json`**: name, version, `"type": "module"`, scripts per interface, dependencies
(ai, zod, bash-tool always + model SDK + interface packages + MCP + state). Use current versions
if docs tools available; otherwise `"latest"`.

**`.env.example`**: all env vars grouped by purpose with comments.

**Deployment config** (if stage 7): Vercel, Docker, or skip.

**`README.md`**: what the agent does, prerequisites, quick start, interfaces, env vars, MCP setup,
deployment.

▶ Next: `verify_build`
</step>

<step name="verify_build">
**Install, type-check, and present the finished project.**

### Install

Run `npm install` in the project directory.

### Smoke test

Run `npx tsc --noEmit`. Fix errors, re-run until clean. If errors persist after 2 attempts,
show them to the user.

### Summary

Show file tree, key files, and how to run each interface. Delete `agent-forge.json`.

▶ Done.
</step>

</process>

<guardrails>
- NEVER combine stages 1-3 into a single message — present one stage per response, wait for confirmation
- NEVER infer approval — wait for explicit user confirmation before advancing
- NEVER hardcode model identifiers (e.g., `claude-sonnet-4.5`, `gpt-4.1`) — look up current recommended models at build time
- NEVER require MCP tools for a skill to function — optional enhancement only
- NEVER `throw` on missing config in bespoke tools — return structured `not_configured` response
- NEVER leave bare TODOs in generated code — implementations must be complete and working
- Stages 4-7 MAY be batched if the user says "just pick sensible defaults" or "proceed"
- The `agent-forge.json` file MUST be deleted after the final build
- No congratulatory filler in responses
- Present options with reasoning — let the recommendation speak for itself
- After user picks, confirm in one sentence, update state, move on
- Keep responses under 500 characters outside of tables, code blocks, and system prompt drafts
</guardrails>

## Scope Boundaries

| In scope | Out of scope (mention if relevant, do not implement) |
|----------|------------------------------------------------------|
| Single-agent projects | RAG pipelines |
| System prompt drafting | Multi-agent orchestration |
| bash-tool + MCP + bespoke tools | Training/fine-tuning |
| Model selection | CI/CD pipelines, Kubernetes |
| Interfaces | Auth for the agent's interface |
| Lightweight deployment | Monitoring and observability |

<success_criteria>
- [ ] Purpose captured: system prompt drafted and confirmed by user
- [ ] Interface chosen: primary + add-ons decided
- [ ] Tools selected: MCP servers and bespoke tools (if any) specified
- [ ] Stages 4-7 configured: model, durability, state, deployment
- [ ] Design confirmed: summary table shown, user approved
- [ ] Agent core generated: agent.ts, tools/, mcp.ts (if needed), tsconfig.json
- [ ] Interface layer generated: all files per the chosen interface(s)
- [ ] Package files generated: package.json, .env.example, README.md, deployment config
- [ ] Type check passes: `npx tsc --noEmit` clean
- [ ] `agent-forge.json` deleted after build
</success_criteria>
