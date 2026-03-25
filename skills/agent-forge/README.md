# agent-forge

Create specialized TypeScript agents by composing AI SDK, Chat SDK, MCP tools, and sandboxes. Interactive wizard that interviews about the agent's purpose, drafts a system prompt, selects tools, picks an interface, and scaffolds a standalone working agent project.

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
3. **Tools** — selects native tools and MCP integrations matched to the agent's purpose
4. **Model** — recommends a provider and configures the agent loop
5. **Durability** — ephemeral (ToolLoopAgent) or durable (DurableAgent + Workflow DevKit)
6. **State** — in-memory, Redis, Postgres, or filesystem based on interface needs
7. **Deployment** — minimal config for Vercel, Railway, Fly.io, or Docker

Each stage recommends with reasoning and lets you override. Decisions cascade — changing your interface automatically re-evaluates state and deployment.

## Architecture

The agent core is always decoupled from its interfaces:

```
Agent Core (agent.ts + tools/)
       ↑ agent.generate() / agent.stream()
       |
Interface Layer (thin wrappers)
  ├── CLI       (~15 lines)
  ├── API       (~20 lines)
  ├── Web chat  (Next.js + AI Elements)
  └── Chat SDK  (Slack, Discord, Telegram)
```

CLI and API can be added to any agent as cheap add-ons. The agent logic never changes when you change the interface.

## Features

- **System prompt drafting** — produces a real, tailored system prompt, not "you are a helpful assistant"
- **Native + MCP tools** — hardened file/shell tools with security requirements, MCP for rich integrations
- **Subagent scaffolding** — each scaffold step runs in a subagent with clean, focused context
- **Cascading invalidation** — change a decision and downstream choices are automatically re-evaluated
- **Durable state** — progress saved to `agent-forge.json`, survives context compression
- **Graceful MCP degradation** — works without context7, flags uncertain API patterns with `// TODO: verify`
- **Minimal dependencies** — only installs what the agent actually needs

## Test scenarios

| Scenario | Prompt | What it tests |
|----------|--------|---------------|
| CLI code reviewer | "Build a CLI agent that reviews code for bugs and security issues" | Happy path, full 7-stage flow, security-hardened tools |
| Slack team bot | "Slack bot for our engineering team, codebase questions + on-call" | Chat SDK complexity, Redis state, deployment |
| Vague request | "Build me an agent." | Interview vs guessing, scope narrowing |
| Over-scoped request | "Agent that browses web, writes code, manages calendar, sends emails..." | Scope pushback, minimal viable agent |
| Mid-conversation change | "Discord bot... actually make it Slack" | Cascading invalidation, downstream re-evaluation |

## Eval results

**Skill win rate: 88% (35/40 criteria comparisons)**

| Eval | Skill Wins | Ties |
|------|-----------|------|
| cli-code-reviewer | 7/8 | 1/8 |
| slack-team-bot | 8/8 | 0/8 |
| vague-request | 7/8 | 1/8 |
| over-scoped-request | 8/8 | 0/8 |
| mid-conversation-change | 5/8 | 3/8 |

Baseline wins: 0/40.

### Where the skill adds value

- **Scope management** — baseline built everything asked for without pushback; skill narrowed over-scoped requests in 2 exchanges with specific technical reasons
- **Architecture** — baseline produces scripts; skill produces agent systems with tool-calling loops and decoupled core/interface
- **Security** — baseline never security-hardens tools; skill always includes path traversal protection, timeouts, size limits
- **Docs-first verification** — skill checks for documentation tools upfront and uses them to produce correct API signatures; baseline uses hardcoded patterns
- **Post-scaffold smoke test** — skill runs `tsc --noEmit` and fixes compilation errors; baseline doesn't verify

### Where the baseline holds up

- Simple CLI agents — both produce working code (different architecture)
- No mid-conversation changes — cascade logic untestable without changes
