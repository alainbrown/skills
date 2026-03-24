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

| Scenario | Prompt | Key decisions |
|----------|--------|---------------|
| CLI code reviewer | "Build an agent that reviews my code for bugs and security issues" | CLI, readFile + searchCode, Anthropic, ephemeral, in-memory, no deployment |
| Slack support bot | "Build a Slack bot for our engineering team that answers codebase questions" | Slack + CLI add-on, readFile + searchCode + listDir, Redis, Vercel |
| Web research agent | "I need a web-based research assistant embedded in our Next.js app" | Web chat + CLI add-on, webSearch + fetchPage, ephemeral, in-memory |

## Eval results

Tested against baseline (LLM without the skill) across 3 scenarios, 6 criteria each:

| Metric | Result |
|--------|--------|
| Skill wins | 8/18 (44%) |
| Baseline wins | 0/18 (0%) |
| Ties | 10/18 (56%) |

**Where the skill adds value:**
- Structured decision process (wins all 3 evals) — systematic stages vs monolithic dump
- Appropriate tools and minimal dependencies (wins 2/3) — prevents over-engineering (baseline added full RAG pipelines and paid services for simple use cases)

**Where the baseline holds up:**
- System prompt quality, interface choice, and project structure are ties — the LLM already does these well

The skill never produces worse output than the baseline.

## Future work

- **Deeper eval cases** — vague requests, over-scoped requests, mid-conversation changes, scope boundary testing
- **Generated agent smoke tests** — `npm run test` that verifies the scaffolded agent can respond to a test prompt
- **Real usage feedback** — refine the skill based on where actual users get stuck
