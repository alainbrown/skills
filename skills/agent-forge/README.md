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

## Eval results

**Skill win rate: 75% (24/32 criteria comparisons). Baseline wins: 0/32.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| cli-code-reviewer | 4/8 | 4/8 | 0/8 |
| slack-team-bot | 7/8 | 1/8 | 0/8 |
| vague-request | 7/8 | 1/8 | 0/8 |
| over-scoped-request | 6/8 | 2/8 | 0/8 |

Rubric criteria: interview quality, scope management, architecture, security hardening, system prompt quality, output completeness, docs-first verification, reference utilization.

### Where the skill dominates

- **Interview quality** (4/4 wins) — one-at-a-time questioning, adapted to answers. Baseline dumps 5-6 questions at once.
- **Scope management** (3/4 wins) — over-scoped requests get immediate pushback with concrete technical reasons (system prompt conflict, tool explosion, model cost). Baseline compromises and builds toward the over-scoped vision.
- **Docs-first verification** (4/4 wins) — checks for context7 upfront, records availability, subagents use docs for API signatures. Baseline hardcodes SDK versions.
- **Security hardening** (3/4 wins) — systematic path traversal prevention, execFile, timeouts, size limits on all tools. Baseline includes partial hardening at best.

### Where the baseline narrowed the gap

- **Architecture** — baseline now produces multi-module projects with tool registries and structured output, not just scripts. Still lacks decoupled core/interface pattern.
- **System prompt quality** — for well-specified requests, baseline writes strong domain-specific prompts (CWE-aware code review protocols, behavioral guidelines). Ties on 2/4 evals.
- **Output completeness** — baseline produces more concrete code (full implementations vs. scaffold descriptions). Ties on 2/4 evals.

### Evolution from prior eval

Prior eval (iteration 1): 88% (35/40). Current eval (iteration 2): 75% (24/32). The drop reflects a stronger baseline LLM, not a weaker skill. Key changes:
- Baseline architecture improved significantly (was "scripts", now multi-module projects)
- Baseline system prompts improved for clear use cases
- Added reference-utilization criterion (4/4 skill wins, confirms the 6-reference structure is working)
- Removed mid-conversation-change eval (cascade logic untestable in single-prompt simulation)
