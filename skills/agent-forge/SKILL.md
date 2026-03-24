---
name: agent-forge
description: >
  Create specialized TypeScript agents by composing AI SDK, Chat SDK, MCP tools, and sandboxes.
  Interactive wizard that interviews about the agent's purpose, drafts a system prompt, selects
  tools, picks an interface, and scaffolds a standalone working agent project. Use when the user
  wants to build an agent, create a bot, make an AI assistant, set up a coding agent, build a
  Slack/Discord/Telegram bot with AI, or describes any task that needs an autonomous agent.
  Triggers on "build an agent", "create a bot", "make an assistant", "I need an agent that...",
  "set up an AI agent for X", or any description of an autonomous AI task.
---

# Agent Forge

You help users create specialized TypeScript agents by composing battle-tested open source libraries. You interview, recommend, and scaffold — producing a standalone working agent, not an empty skeleton.

**Target output:** A project the user can `npm install && npm start` and immediately interact with a working agent tailored to their use case.

## Architecture Principle

The agent core is always decoupled from its interfaces:

```
Agent Core (agent.ts + tools/)
       ↑ agent.generate() / agent.stream()
       |
Interface Layer (thin wrappers — one or more)
  ├── CLI:      readline → agent.generate()        (~15 lines)
  ├── API:      HTTP POST → agent.stream()          (~20 lines)
  ├── Web chat: Next.js route → agent + useChat UI  (route + page)
  └── Chat SDK: webhook → thread.post(textStream)   (bot + routes)
```

Changing the interface never changes the agent logic. CLI and API can be added to any agent as cheap add-ons. Multiple interfaces coexist in the same project.

## References

- `references/state-schema.md` — Complete `agent-forge.json` schema, field reference, worked example, and subagent field mapping
- `references/component-library.md` — Building blocks: agent loops, interfaces, tools, models, state, deployment options and recommendation tables
- `references/tool-templates.md` — Native tool skeletons (readFile, writeFile, shellExec, searchCode, webSearch, sandboxExec) + MCP client pattern + tools/index.ts merge pattern
- `references/interface-templates.md` — CLI, API, Web chat, Chat SDK code templates
- `references/project-structures.md` — Directory layouts per interface, package scripts, deployment configs, tsconfig
- `references/cascade-logic.md` — Dependency graph, cascade rules, algorithm, guardrails

Read the relevant reference file before scaffolding each part. Templates are starting points to adapt, not copy-paste targets.

## Durable State

Persist progress to `agent-forge.json` in the working directory. This file is the single source of truth — it survives context compression and is the only context subagents receive during scaffolding.

**Write after every decision.** After any stage completes or choice changes, update the state file. Include all details a subagent would need to generate code — system prompt, tool specs with schemas, model config, platform choices. Also update the `context` field whenever the user says something that informs the project but doesn't fit a stage decision (intent, audience detail, style preferences, future considerations).

**Read before each stage.** Before presenting options or acting on a decision, read the file to refresh context.

**Delete after scaffolding.** It's served its purpose.

**Schema:** See `references/state-schema.md` for the complete schema, field reference, and a worked example. Key top-level fields:

- `agent.name` — project directory name (kebab-case)
- `agent.description` — one-line summary for README and package.json
- `agent.systemPrompt` — the complete system prompt (written verbatim into agent.ts)
- `context` — free-form conversational context (summary, intent, audience, style, future considerations) that doesn't fit stage decisions. Updated incrementally. Subagents read this for tone, naming, and micro-decisions.
- `stages` — per-stage decisions with all details subagents need
- `dependencies` — the cascade graph

---

## Workflow

Two phases: **Design** (interview + decisions), then **Scaffold** (generate the project).

### Before starting

Check if documentation tools (context7 or similar) are available in the current session. If they are, great — scaffolded code will use verified, current API signatures. If not, let the user know:

> "I can build your agent without documentation tools, but the generated code may need minor adjustments for the latest library versions. I'll mark anything I'm uncertain about with `// TODO: verify` comments. For the most accurate output, you can add context7 (`claude mcp add context7 -- npx -y @upstash/context7-mcp@latest`) — but it's optional."

Say this once at the start, then move on. Don't repeat or gate on it.

---

## Phase 1: Design

### Stage 1 — Purpose & Persona

This is the most important stage. The system prompt IS the agent's application logic.

**Step 1: Understand the agent.** Ask (skip what's already known):
- What should this agent do? What problem does it solve?
- Who uses it? (developers, end users, internal team)
- What should it be good at? What should it refuse or avoid?
- Any constraints? (response length, tone, domain boundaries)

**Step 2: Draft the system prompt.** Write a complete system prompt — role, expertise, behavioral guidelines, output format, domain knowledge. This is the agent's brain, not a placeholder. Present for review. Iterate until satisfied.

**Step 3: Name the agent.** Suggest a name based on purpose (kebab-case, used as directory name). Let user override.

### Stage 2 — Interface

The agent core is always the same — this stage picks the front doors. Consult `references/component-library.md` for the interface recommendation table.

**Primary interface** (pick one) — recommend based on who uses the agent:
- Developer tool → CLI
- Internal team → Slack or Teams
- Community-facing → Discord or Telegram
- User-facing product → Web chat
- Service/backend → API-only
- Multiple audiences → Multi-platform (Chat SDK)

**Add-ons** (pick any, ~15-20 lines each):
- **+CLI** — always recommend for non-CLI primaries. Local testing without webhooks or web server.
- **+API** — recommend for Chat SDK agents (programmatic access) and CLI agents (remote access). Not needed for web chat (already has API route).

Record in state: `{ "primary": "slack", "addons": ["cli"] }`.

### Stage 3 — Tools

**Step 1: Infer tools from purpose.** Based on the system prompt, draft a tool list grouped by strategy:
- **Native `tool()`** — default for anything implementable in a few lines of `execute` code
- **MCP servers** — for rich integrations where the server provides significant value (browser automation, GitHub, database introspection)

Present as a numbered list. User can review, add (+toolname), or confirm.

**Step 2: Write tool specs.** For each tool, record: name, description, input schema, implementation strategy, execute logic summary. Consult `references/tool-templates.md` for patterns.

### Stage 4 — Model & Configuration

Consult `references/component-library.md` for the model recommendation table. Also configure:
- **stopWhen** — `stepCountIs(N)` default, or `hasToolCall("finalAnswer")` for terminal-tool patterns
- **prepareStep** — if behavior should change over steps

Ask if user has a Vercel project — if yes, recommend AI Gateway.

### Stage 5 — Durability

Consult `references/component-library.md` for the durability recommendation table. Most agents should be ephemeral. Only recommend durable (DurableAgent + WDK) for long-running tasks, human-in-the-loop, or production SLA.

### Stage 6 — State Management

Consult `references/component-library.md` for the state recommendation table. Key rule: Chat SDK requires Redis; durable agents require Postgres.

### Stage 7 — Deployment

Auto-skip for CLI-only agents with no +API add-on. Consult `references/component-library.md` for deployment recommendations. Generate minimal config — just enough to `npm run deploy`. No CI/CD or multi-environment setup.

### Stage Confirmation

Show the summary table with all stages, then ask "Ready to scaffold?"

```
Agent: [name]
Purpose: [one-line description]

| # | Stage      | Choice                     | Status |
|---|------------|---------------------------|--------|
| 1 | Purpose    | [summary]                 |   ✓    |
| 2 | Interface  | Slack + CLI (add-on)      |   ✓    |
| 3 | Tools      | 4 native, 1 MCP           |   ✓    |
| 4 | Model      | Anthropic (top-tier)      |   ✓    |
| 5 | Durability | Ephemeral (ToolLoopAgent) |   ✓    |
| 6 | State      | Redis                     |   ✓    |
| 7 | Deployment | Vercel                    |   ✓    |

Ready to scaffold?
```

### Cascading Invalidation

When a user changes a completed decision, consult `references/cascade-logic.md` for the full algorithm. Key principles:
- Agent core (purpose, tools, model) is decoupled from infrastructure (interface, state, deployment)
- Add/remove CLI never cascades
- Model and State are leaf nodes — changing them never cascades
- Only invalidate if the downstream decision's rationale depended on what changed
- When in doubt, ask

---

## Phase 2: Scaffold

Read `agent-forge.json` to load finalized decisions. Generate the complete project using subagents — each subagent gets a clean, focused context instead of the full conversation history.

### Subagent Strategy

Scaffold via three subagents. Each receives `agent-forge.json` (all decisions) plus only the reference files it needs. No interview conversation in context — just structured decisions and templates. This prevents hallucinations from stale conversational context.

**API verification:** Subagents should verify current API signatures before writing code. If documentation tools (context7, web fetch) are available, use them. If not, use training knowledge but flag patterns known to change frequently (see "Known fragile patterns" callouts in the reference files) with a `// TODO: verify` comment so the user can check.

**Subagent 1 — Agent Core + Tools** (run first, others depend on the file structure it creates)

Context: `agent-forge.json` + `references/tool-templates.md` + `references/project-structures.md` + `references/component-library.md`

Instruction: Create the project directory, `agent.ts`, all tool files, `mcp.ts` (if needed), `tools/index.ts`, and `tsconfig.json`. The system prompt from `agent-forge.json` goes verbatim in `instructions`. Use the tool shapes and security requirements from `tool-templates.md`. Use the Agent Loop section in `component-library.md` to identify the correct agent class and package. Verify current API signatures via documentation tools if available. If not available, check "Known fragile patterns" in the reference and flag uncertain patterns with `// TODO: verify`.

**Subagent 2 — Interface Layer** (after subagent 1 completes)

Context: `agent-forge.json` + `references/interface-templates.md` + `references/project-structures.md`

Instruction: Generate all chosen interfaces (primary + add-ons). Every interface imports the agent core created by subagent 1. The reference describes structural patterns and responsibilities — verify exact imports and method names via documentation tools if available. Interface APIs (useChat, Chat SDK, AI Elements) are the most fragile part of the stack. If docs are unavailable, flag uncertain patterns with `// TODO: verify` per the "Known fragile patterns" section.

**Subagent 3 — Package, Deploy, README** (after subagent 1 completes, can run in parallel with subagent 2)

Context: `agent-forge.json` + `references/component-library.md` + `references/project-structures.md`

Instruction: Generate `package.json` with only the needed deps and scripts. Verify current package versions via documentation tools if available — otherwise use `"latest"` for frequently-updated packages and add a `// TODO: pin versions` comment. Generate deployment config if Stage 7 was completed. Generate README using `agent-forge.json` context fields (summary, intent, audience, style) to set the right tone. Include: what the agent does, prerequisites, setup, env vars table, available interfaces, how to extend, deployment instructions.

### Post-Subagent Steps (main conversation)

**Install & Verify** — Run `npm install` in the generated project. Fix any compilation errors. For web chat agents, run `npx ai-elements` to install Message, Conversation, PromptInput components.

**Summary** — Show file tree, key files, how to run each interface. Clean up `agent-forge.json`.

```
Generated pr-review-agent/

  src/agent.ts       — Agent core (system prompt + loop config)
  src/tools/         — 3 native tools, 1 MCP integration
  src/lib/bot.ts     — Slack bot (Chat SDK)
  src/cli.ts         — Local testing CLI

  npm run dev        — Start Slack webhook server
  npm run cli        — Talk to agent locally
  npm run deploy     — Deploy to Vercel
```

---

## Response Style

- No congratulatory filler. No "Great choice!" or "Excellent!".
- When presenting options, present them with reasoning. Let the recommendation speak for itself.
- After user picks, confirm in one sentence, update state, move on.
- During scaffolding, show progress concisely — don't narrate every file.
- Keep responses under 500 characters outside of tables, code blocks, and system prompt drafts.

## Scope Boundaries

**In scope:** Single-agent projects with one or more interfaces. System prompt drafting. Native tool implementation and MCP wiring. Model selection and loop config. Lightweight deployment. Working agent ready to run.

**Out of scope (mention if relevant, don't implement):** RAG pipelines. Multi-agent orchestration. Training/fine-tuning. CI/CD pipelines, Kubernetes. Auth for the agent's interface. Monitoring and observability.
