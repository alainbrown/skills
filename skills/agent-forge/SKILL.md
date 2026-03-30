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

You help users create specialized TypeScript agents by composing AI SDK with bash-tool, MCP servers, and targeted interfaces. You interview, recommend, and build — producing a working agent project.

**Target output:** A project the user can `npm install && npm start` and immediately interact with. The agent uses `bash-tool` for general-purpose operations, MCP servers for rich integrations, and bespoke native tools only for domain-specific operations that bash and MCP can't handle.

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

### 1. bash-tool (always included)

`bash-tool` wraps `just-bash` and provides AI SDK-compatible tools via `createBashTool()`. Covers shell execution, file I/O, grep, sed, awk, jq, curl, and all common Unix operations. One import, dozens of capabilities, sandboxed.

### 2. MCP servers (configured per agent)

Rich integrations from the MCP ecosystem. Recommended servers:

**Cloud providers (all official):**

| Provider | Package / Command | Run with |
|----------|-------------------|----------|
| AWS | `powertools-for-aws-mcp` | `npx -y powertools-for-aws-mcp` |
| GCP | `gcloud-mcp` | `npx -y gcloud-mcp` |
| Azure | `@azure/mcp` | `npx -y @azure/mcp@latest server start` |
| Vercel | `mcp-handler` | See Vercel MCP docs |

**General-purpose (all official):**

| Server | Package | Run with |
|--------|---------|----------|
| GitHub | `@modelcontextprotocol/server-github` | `npx -y @modelcontextprotocol/server-github` |
| Playwright | `@playwright/mcp` | `npx -y @playwright/mcp@latest` |
| Filesystem | `@modelcontextprotocol/server-filesystem` | `npx -y @modelcontextprotocol/server-filesystem /path` |
| Fetch | `@modelcontextprotocol/server-fetch` | `npx -y @modelcontextprotocol/server-fetch` |

**Recommendation by agent purpose:**

| Agent purpose | Recommended MCP servers |
|---------------|------------------------|
| Cloud infrastructure (single cloud) | That cloud's MCP (AWS/GCP/Azure) |
| Cloud infrastructure (multi-cloud) | AWS + GCP + Azure MCPs (user configures what they use) |
| Code review / dev tools | GitHub MCP |
| Web scraping / testing | Playwright MCP, Fetch MCP |
| Deployment / hosting | Vercel MCP |
| Research / Q&A | Fetch MCP |
| General-purpose | Filesystem MCP |

### 3. Bespoke native tools (rare)

Only for domain-specific operations that bash and MCP can't handle. Written following the integration-point pattern in `references/integration-tool-pattern.ts`. Examples: custom safety-tier enforcement, proprietary API wrappers, cost projection from internal data.

**Decision flowchart:**
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

## Durable State

Persist progress to `agent-forge.json` in the working directory. This file is the single source of truth — it survives context compression and drives the build phase.

**Write after every decision.** After any stage completes or choice changes, update the state file.

**Read before each stage.** Before presenting options or acting on a decision, read the file to refresh context.

**Delete after building.** It's served its purpose.

**Schema:** See `references/state-schema.md` for the complete schema.

---

## Workflow

Two phases: **Design** (interview + decisions), then **Build** (generate the project).

### Before starting

Check if documentation tools (context7 or similar) are available. Record in `agent-forge.json` under `docsTools: true|false`. When available, use them to look up current AI SDK API signatures before writing code.

---

## Phase 1: Design

**Stage flow — one at a time.** Present one stage per response. After presenting your recommendation and reasoning, stop and wait for the user to respond. Do not combine multiple stages into a single message. Do not infer approval.

**Exception:** Stages 4-7 are often straightforward. If the user says "just pick sensible defaults" or "proceed," you may present stages 4-7 together as a batch. Never batch stages 1-3.

**After each stage:** Update `agent-forge.json`, then present the next stage.

### Stage 1 — Purpose & Persona

The system prompt IS the agent's application logic.

**Step 1: Understand the agent.** Ask (skip what's already known):
- What should this agent do? What problem does it solve?
- Who uses it? (developers, end users, internal team)
- What should it be good at? What should it refuse or avoid?
- Any constraints? (response length, tone, domain boundaries)

**Step 2: Draft the system prompt.** Write a complete system prompt — role, expertise, behavioral guidelines, output format, domain knowledge. Present for review. Iterate until satisfied.

**Step 3: Name the agent.** Suggest a name (kebab-case). Let user override.

**→ Stop here.** Wait for confirmation before advancing to Stage 2.

### Stage 2 — Interface

Consult `references/component-library.md` for the interface recommendation table.

**Primary interface** (pick one):
- Developer tool → CLI
- Internal team → Slack or Teams
- Community-facing → Discord or Telegram
- User-facing product → Web chat
- Service/backend → API-only
- Multiple audiences → Multi-platform (Chat SDK)

**Add-ons** (pick any):
- **+CLI** — always recommend for non-CLI primaries
- **+API** — recommend for Chat SDK agents and CLI agents needing remote access

**→ Stop here.** Wait for confirmation before advancing to Stage 3.

### Stage 3 — Tools

**Step 1: Determine tool needs.** bash-tool is always included. Determine:
- Which **MCP servers** the agent needs (recommend from the tables above)
- Whether any **bespoke native tools** are needed (justify why bash/MCP can't cover them)

**Step 2: Write specs** for bespoke tools (if any) and record MCP server choices.

**→ Stop here.** Wait for confirmation before advancing to Stage 4.

### Stage 4 — Model & Configuration

Consult `references/component-library.md`. Configure model provider, `stopWhen`, and `prepareStep`.

### Stage 5 — Durability

Most agents should be ephemeral (`ToolLoopAgent`). Only recommend durable for long-running tasks, human-in-the-loop, or production SLA.

### Stage 6 — State Management

Key rule: Chat SDK requires Redis; durable agents require Postgres.

### Stage 7 — Deployment

Auto-skip for CLI-only. Vercel for Next.js, Railway/Fly for others.

### Stage Confirmation

Show summary table, ask "Ready to build?"

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

### Cascading Invalidation

See `references/cascade-logic.md`. Key principles:
- Agent core is decoupled from infrastructure
- Add/remove CLI never cascades
- Model and State are leaf nodes
- When in doubt, ask

---

## Phase 2: Build

Read `agent-forge.json` for all finalized decisions. Generate the project files using subagents. If `docsTools` is true, subagents must look up current AI SDK API signatures from documentation before writing code.

### Subagent 1 — Agent Core + Tools (run first)

Generate these files based on `agent-forge.json`:

**`agent.ts`** (~15 lines):
- Import `ToolLoopAgent`, `stepCountIs` from `ai`
- Import model provider from stage 4 decision
- Import `createBashTool` from `bash-tool`
- Import native tools from `./tools` (if any bespoke tools exist)
- Call `await createBashTool()` to get bash tools
- If MCP servers chosen: import `connectMCPTools` from `./mcp`, call it, merge tools
- Create and export `ToolLoopAgent` with: model, `instructions` set to system prompt from `agent-forge.json`, merged tools (`{ ...bashTools, ...mcpTools, ...nativeTools }`), `stopWhen` from stage 4
- System prompt goes verbatim — do not modify it

**`mcp.ts`** (only if MCP servers chosen):
- Import `createMCPClient` from `@ai-sdk/mcp`
- Define MCP server configs from stage 3 (package name, transport: stdio, args)
- Export `connectMCPTools()` — connects to each server, merges tools into flat record, logs warnings for failed connections
- Export `closeMCPClients()` — shuts down all clients
- Handle connection failures gracefully — never crash

**`tools/index.ts`**:
- Import and re-export all bespoke native tools (if any)
- Export `nativeTools` record merging them all

**Bespoke tool files** (if any, following `references/integration-tool-pattern.ts`):
- Import `tool` from `ai`, `z` from `zod`
- Define Zod input schema with `.describe()` annotations
- Execute function must: check credentials exist → return `{ status: "not_configured", message, setup }` if missing → perform the operation → return typed result
- Never `throw` on missing config. Never leave bare TODOs. Complete, working implementations.

**`tsconfig.json`**:
- CLI/API: target ES2022, Node16 module resolution, strict, `@/*` path alias
- Next.js: bundler resolution, JSX preserve, `next` plugin, `@/*` path alias

### Subagent 2 — Interface Layer (after subagent 1)

Generate based on stage 2 decisions. Every interface imports the agent from `agent.ts`.

**CLI** (`src/cli.ts`, ~20 lines):
- Import `readline` from `node:readline/promises`
- Import agent from appropriate path (`./agent` for standalone, `./lib/agent` for Next.js)
- Loop: read input → `agent.stream({ prompt })` → iterate `textStream` → write chunks to stdout
- Handle Ctrl+C gracefully. Print startup message with agent name.

**API** (`src/server.ts`, ~25 lines):
- Import `Hono` from `hono`
- Import agent
- POST `/api/agent`: parse `{ prompt }` from body, call `agent.stream()`, return streamed response
- GET `/health`: return `{ status: "ok" }`
- Start on `PORT` env var (default 3000)

**Web chat** (4 files):

`src/app/api/chat/route.ts`:
- Import `streamText`, `UIMessage`, `convertToModelMessages` from `ai`
- Import model provider
- POST handler: parse `{ messages: UIMessage[] }`, `await convertToModelMessages(messages)`, call `streamText()` with model + system prompt + converted messages, return `result.toUIMessageStreamResponse()`
- Set `maxDuration = 60`

`src/app/page.tsx`:
- `'use client'` directive
- Import `useChat` from `@ai-sdk/react`
- Dark-themed chat UI with Tailwind:
  - Header: agent name, status indicator (streaming/ready with colored dot)
  - Messages: render via `message.parts` — handle `text` type (whitespace-pre-wrap) and `tool-invocation` type (show tool name + state)
  - Empty state: agent description + 4 clickable suggestion prompts relevant to the agent's domain
  - Input: form with `sendMessage({ text: input })`, disabled during streaming
  - Footer: brief note about the agent's behavior
- Style should match the agent's domain (DevOps dashboard feel, support chat feel, etc.)

`src/app/layout.tsx`:
- Import Geist fonts from `next/font/google`
- `className="dark"` on `<html>`
- Metadata: title from agent name, description from agent description

`src/app/globals.css`:
- `@import "tailwindcss"`
- Dark theme CSS variables (zinc-950 background, zinc-100 text)
- Custom scrollbar styling, code block styling

**Chat SDK** (2 files per platform):

`src/lib/bot.ts`:
- Import `Chat` from `chat`
- Import platform adapter(s) from `@chat-adapter/<platform>` (e.g., `createSlackAdapter` from `@chat-adapter/slack`)
- Import state adapter from `@chat-adapter/state-redis`
- Import agent
- Create `Chat` instance with adapters map + Redis state
- `onNewMention`: subscribe to thread, call `agent.stream({ prompt })`, `thread.post(result.textStream)`
- `onSubscribedMessage`: call `agent.stream({ prompt })`, post response
- Export `bot`

`src/app/api/bot/<platform>/route.ts` (one per platform):
- Import bot
- POST handler: delegate to `bot.webhooks.<platform>(request, { waitUntil })`

**`next.config.ts`** (if Next.js):
- Mark Chat SDK packages as `serverExternalPackages`

### Subagent 3 — Package, Deploy, README (parallel with subagent 2)

**`package.json`**:
- name, version, description from `agent-forge.json`
- `"type": "module"`
- Scripts: appropriate for the primary interface (Next.js or standalone) + add-on scripts
- Dependencies: `ai`, `zod`, `bash-tool` (always) + model provider SDK + interface packages + MCP (`@ai-sdk/mcp`) + state + only what's needed
- devDependencies: `typescript`, `tsx`, `@types/node` + React types + Tailwind (if web chat)
- Look up current versions if docs tools available; otherwise use `"latest"`

**`.env.example`**: all env vars from stage 7, grouped by purpose with comments

**Deployment config** (if stage 7): Vercel (`vercel.json` only if needed for extended timeout), Docker (Dockerfile), or skip

**`README.md`**: what the agent does, prerequisites, quick start, interfaces, env vars table, MCP server setup instructions, deployment

### Post-Build Steps

**Install** — `npm install` in the project directory.

**Smoke test** — `npx tsc --noEmit`. Fix errors, re-run until clean. If errors persist after 2 attempts, show them to the user.

**Summary** — Show file tree, key files, how to run each interface. Delete `agent-forge.json`.

---

## Response Style

- No congratulatory filler.
- Present options with reasoning. Let the recommendation speak for itself.
- After user picks, confirm in one sentence, update state, move on.
- During building, show progress concisely.
- Keep responses under 500 characters outside of tables, code blocks, and system prompt drafts.

## Scope Boundaries

**In scope:** Single-agent projects. System prompt drafting. bash-tool + MCP + bespoke tools. Model selection. Interfaces. Lightweight deployment.

**Out of scope (mention if relevant, don't implement):** RAG pipelines. Multi-agent orchestration. Training/fine-tuning. CI/CD pipelines, Kubernetes. Auth for the agent's interface. Monitoring and observability.
