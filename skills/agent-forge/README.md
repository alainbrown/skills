# agent-forge

Create specialized TypeScript agents by composing AI SDK, Chat SDK, MCP tools, and bash-tool. Interactive wizard that interviews about the agent's purpose, drafts a system prompt, selects tools, picks an interface, and scaffolds a standalone working agent project.

## Usage

Just describe what you want to build:

```
build me a Slack bot that reviews PRs for our team
I need a CLI agent that can search and edit code
create a research assistant for our Next.js app
set up an agent that monitors GitHub issues
```

Or invoke directly:

```
/agent-forge
```

## What it does

Agent Forge walks you through a structured 7-stage design process, then scaffolds a complete project using subagents with focused context:

1. **Purpose & Persona** — interviews you, drafts a tailored system prompt (the agent's brain)
2. **Interface** — picks the right front door: CLI, Web chat, Slack/Discord/Telegram, API, or multi-platform
3. **Tools** — selects bash-tool, MCP servers, and bespoke tools matched to the agent's purpose
4. **Model** — recommends a provider and configures the agent loop
5. **Durability** — ephemeral (ToolLoopAgent) or durable (DurableAgent + Workflow DevKit)
6. **State** — in-memory, Redis, Postgres, or filesystem based on interface needs
7. **Deployment** — minimal config for Vercel, Railway, Fly.io, or Docker

Each stage recommends with reasoning and lets you override. Decisions cascade — changing your interface automatically re-evaluates state and deployment.

## Architecture

The agent core is always decoupled from its interfaces:

```
Agent Core (agent.ts)
  ├── bash-tool          — sandboxed shell, file I/O, text processing
  ├── MCP servers        — GitHub, Playwright, Filesystem, cloud providers
  └── bespoke tools      — rare, domain-specific only
       ↑
       | agent.generate() / agent.stream()
       |
Interface Layer (thin wrappers)
  ├── CLI       (~20 lines)
  ├── API       (~25 lines)
  ├── Web chat  (Next.js + useChat)
  └── Chat SDK  (Slack, Discord, Telegram)
```

CLI and API can be added to any agent as cheap add-ons. The agent logic never changes when you change the interface.

## Features

- **System prompt drafting** — produces a real, tailored system prompt, not "you are a helpful assistant"
- **3-layer tool architecture** — bash-tool (always) + MCP servers (configured) + bespoke tools (rare), with a decision flowchart that keeps tool selection minimal
- **Subagent scaffolding** — each scaffold step runs in a subagent with clean, focused context
- **Cascading invalidation** — change a decision and downstream choices are automatically re-evaluated
- **Durable state** — progress saved to `agent-forge.json`, survives context compression
- **Docs-first verification** — checks for context7, uses docs for API signatures instead of hardcoding
- **Scope management** — pushes back on over-scoped requests with concrete technical reasoning
- **Minimal dependencies** — only installs what the agent actually needs

## Safety

- Never hardcodes model identifiers — looks up current models at build time
- Bespoke tools follow the integration-tool-pattern: credential check first, `not_configured` fallback, never throw
- MCP connections fail gracefully — agent continues without unavailable servers
- Stage discipline: stages 1-3 are never batched, explicit confirmation required before advancing

## Edge cases handled

- **Vague requests** ("build me an agent") — interviews to narrow scope instead of guessing
- **Over-scoped requests** — pushes back with technical reasons (prompt dilution, tool overload), offers focused alternatives
- **Missing docs tools** — works without context7, flags uncertain patterns with `// TODO: verify`
- **Mid-design changes** — cascade logic re-evaluates affected downstream decisions

## Test scenarios

| Scenario | Prompt | What it tests |
|----------|--------|---------------|
| CLI code reviewer | "Build a CLI agent that reviews code for bugs and security issues" | Happy path, full 7-stage flow, tool architecture |
| Slack team bot | "Slack bot for our engineering team, codebase questions + on-call" | Chat SDK complexity, Redis state, deployment |
| Vague request | "Build me an agent." | Interview vs guessing, scope narrowing |
| Over-scoped request | "Agent that browses web, writes code, manages calendar, sends emails..." | Scope pushback, minimal viable agent |

## Eval results

**Skill win rate: 94% (30/32 criteria comparisons). Baseline wins: 0/32.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| cli-code-reviewer | 6/8 | 2/8 | 0/8 |
| slack-team-bot | 8/8 | 0/8 | 0/8 |
| vague-request | 8/8 | 0/8 | 0/8 |
| over-scoped-request | 8/8 | 0/8 | 0/8 |

Rubric criteria: interview quality, scope management, architecture, tool architecture, system prompt quality, output completeness, docs-first verification, reference utilization.

### Where the skill dominates

- **Interview quality** (4/4 wins) — one-at-a-time questioning, adapted to answers. Baseline dumps questions or skips them entirely.
- **Tool architecture** (4/4 wins) — bash-tool + MCP servers via the 3-layer decision flowchart. Baseline hand-writes tools without MCP or sandboxing.
- **Architecture** (4/4 wins) — decoupled core/interface pattern with proper module separation. Baseline produces flat structures or tightly coupled orchestrators.
- **Scope management** (3/4 wins, 1 tie) — over-scoped requests get pushback with concrete technical reasons. Baseline builds everything without questioning.
- **System prompt quality** (4/4 wins) — detailed, domain-specific prompts with behavioral rules, boundaries, and output formats. Baseline produces generic prompts.
- **Docs-first verification** (4/4 wins) — checks for context7 upfront, uses docs for API signatures. Baseline hardcodes SDK versions.
- **Reference utilization** (4/4 wins) — component-library, project-structures, and integration-tool-pattern shape every output.

### Where the baseline holds up

- **Output completeness** (1/4 tie on cli-code-reviewer) — for well-scoped requests, the baseline produces functional code, though without the structural advantages.
- **Scope management** (1/4 tie on cli-code-reviewer) — when the request is already well-scoped, both handle it fine.

### Evolution across evals

| Iteration | Win rate | Notes |
|-----------|----------|-------|
| 1 | 88% (35/40) | Initial eval with 5 evals, 8 criteria |
| 2 | 75% (24/32) | Baseline LLM improved; dropped to 4 evals, 8 criteria |
| 3 | 94% (30/32) | bash-tool + MCP refactor; renamed security-hardening to tool-architecture |

The jump from 75% to 94% reflects the bash-tool + MCP refactor (commit a7b4322), which gave the skill a structural advantage the baseline can't replicate. The baseline's architecture and system prompt quality have not kept pace — while baseline code generation improved, the skill's systematic design process consistently produces better-structured, more purposeful agents.
