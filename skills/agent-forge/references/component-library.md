# Component Library

Building blocks for composing agents. This file describes **what exists and when to use it** — not exact versions or API signatures.

**Documentation tools (context7, web fetch) are optional.** If available, use them to verify current package versions and API signatures before scaffolding. If not available, the decision logic in this file (which package for which use case) is stable — only the exact versions and constructor signatures need caution. Use `"latest"` for frequently-updated packages and flag with `// TODO: pin versions`.

## Agent Loop

| Option | Package | When to use |
|--------|---------|-------------|
| ToolLoopAgent | `ai` | Default. Ephemeral agents, most use cases |
| DurableAgent | `@workflow/ai/agent` | Must survive crashes, long-running, needs pause/resume |

Look up: Current class names and constructor signatures. These have changed multiple times (Agent → Experimental_Agent → ToolLoopAgent). Verify before writing.

## Interfaces

| Option | Key packages | When to use |
|--------|-------------|-------------|
| CLI | `readline` (built-in) | Developer tools, scripts, local agents |
| Web chat | `ai`, `@ai-sdk/react`, `next` | User-facing web apps, dashboards |
| Slack | `chat`, `@chat-adapter/slack` | Team tools, internal bots |
| Discord | `chat`, `@chat-adapter/discord` | Community bots, gaming |
| Telegram | `chat`, `@chat-adapter/telegram` | Notifications, personal assistants |
| Multi-platform | `chat` + multiple adapters | Same agent across platforms |
| API-only | `hono` or `express` | Headless, consumed by other services |

## Tools

| Category | Strategy | When to use |
|----------|----------|-------------|
| File operations | Native `tool()` — hardened (see tool-templates.md) | Code agents, document processors |
| Shell/command execution | Native `tool()` — hardened, or `just-bash` for virtual shell | Dev tools, automation agents |
| Web search | Native `tool()` — flexible, adapter pattern | Research agents, Q&A |
| Code execution (sandboxed) | `just-bash` (lightweight), `e2b` (managed), or `@vercel/sandbox` (Vercel) | Untrusted code, data analysis |
| Browser automation | MCP (`@playwright/mcp`) | Web scraping, testing agents |
| GitHub/GitLab | MCP (`@modelcontextprotocol/server-github`) | Code review, PR agents |
| Database queries | Native `tool()` — flexible, varies by DB | Data agents, admin tools |
| API integrations | Native `tool()` — flexible, varies by API | Domain-specific agents |
| Domain-specific MCP | `@ai-sdk/mcp` + server URL | Exotic integrations, third-party tools |

### Tool strategy guide

- **Native hardened** — use for file I/O and shell. Security-sensitive, well-defined shapes. Adapt from `references/tool-templates.md` security requirements.
- **Native flexible** — use for web search, DB queries, API calls. Provider varies, use adapter pattern from `references/tool-templates.md`.
- **Package-based** — use for sandboxing (`just-bash`, `e2b`, `@vercel/sandbox`). Install the package, write a thin `tool()` wrapper. Look up current API before writing.
- **MCP** — use for rich integrations where the server provides significant value. Browser automation, GitHub, database introspection.

## Models

| Provider | Package | When to recommend |
|----------|---------|-------------------|
| Anthropic | `@ai-sdk/anthropic` | Code tasks, complex reasoning |
| OpenAI | `@ai-sdk/openai` | General-purpose, large ecosystem |
| Google | `@ai-sdk/google` | Fast/cheap tier, multimodal |

If the user has a Vercel project, recommend AI Gateway — plain `"provider/model"` strings route through the gateway automatically. No provider SDK needed. OIDC auth via `vercel env pull`.

**Do not hardcode model identifiers** (e.g., `claude-sonnet-4.5`, `gpt-4.1`). These change frequently. When scaffolding, look up the current recommended model for the chosen provider. Use the latest stable model, not an outdated one from this file.

### Model recommendation logic (stable)

| Agent complexity | Tier | Reasoning |
|-----------------|------|-----------|
| Simple Q&A, formatting, triage | Cheapest/fastest from chosen provider | Low reasoning load, high volume |
| Code generation, analysis, review | Mid-to-top tier from chosen provider | Needs strong code understanding |
| Complex reasoning, research, multi-step | Top tier from chosen provider | Needs strong reasoning + tool use |
| Multi-modal (images, files) | Top tier with vision support | Needs multimodal input |

## State Management

| Option | Key packages | When to use |
|--------|-------------|-------------|
| In-memory | None | CLI tools, short-lived agents |
| Filesystem | `node:fs` | Local agents, development |
| Redis | `@upstash/redis` or `ioredis` | Chat SDK bots, production multi-instance |
| Postgres | `@neondatabase/serverless` or `pg` | Durable agents, conversation history |

### State recommendation logic (stable)

| Situation | Recommended | Why |
|-----------|-------------|-----|
| CLI | In-memory or filesystem | Single user, local |
| Web chat (single server) | In-memory | Session-scoped |
| Web chat (multi-server) | Redis | Shared state across instances |
| Chat SDK (any platform) | Redis | Required for multi-instance Chat SDK |
| Durable agent | Postgres | Workflow DevKit state backend |
| Conversation history needed | Postgres or filesystem | Persistent across sessions |

## Durability

| Situation | Recommended | Why |
|-----------|-------------|-----|
| CLI tool, short tasks | Ephemeral (ToolLoopAgent) | Simple, no infrastructure |
| Web chat, conversational | Ephemeral (ToolLoopAgent) | Session-scoped |
| Chat platform bot | Ephemeral (ToolLoopAgent) | Chat SDK manages message state |
| Long-running tasks (>5 min) | Durable (DurableAgent + WDK) | Survives crashes, observable |
| Human-in-the-loop approval | Durable (DurableAgent + WDK) | Can pause for days |
| Production agent with SLA | Durable (DurableAgent + WDK) | Retryable, auditable |

Most agents should be ephemeral. Only recommend durable when there's a clear reason.

## Deployment

| Primary interface | Recommended host | Why |
|------------------|-----------------|-----|
| Web chat (Next.js) | Vercel | Zero-config for Next.js |
| Chat SDK bot | Vercel or Railway | Needs persistent URL for webhooks |
| API-only | Railway, Fly.io, or Vercel | Depends on latency/region needs |
| CLI-only | Skip | Runs locally |
| User has existing infra | Skip | Document requirements, user deploys |

## Dependencies

Always required:
- `ai` — AI SDK core
- `zod` — schema validation for tools
- `typescript`, `tsx`, `@types/node` — TypeScript tooling

Conditional (look up current versions before adding to package.json):
- Provider SDK — based on model choice
- `next`, `@ai-sdk/react` — web chat or Chat SDK primary
- `chat`, `@chat-adapter/<platform>`, `@chat-adapter/state-redis` — Chat SDK (state adapter required alongside Redis client)
- `@ai-sdk/mcp` — if MCP tools chosen
- `@upstash/redis` or `ioredis` — if Redis state (without Chat SDK)
- `@neondatabase/serverless` or `pg` — if Postgres state
- `just-bash` — if virtual shell tools
- `e2b` — if managed sandbox
- `hono` — if API-only primary or +API add-on
