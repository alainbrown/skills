# Component Library

Building blocks for composing agents. This file describes **what exists and when to use it** — not exact versions or API signatures.

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

Every agent gets three layers of tools:

### Layer 1: bash-tool (always included)

`bash-tool` wraps `just-bash` and provides AI SDK-compatible tools via `createBashTool()`. Covers:
- Shell execution (grep, sed, awk, jq, curl, etc.)
- File I/O (cat, read, write, mkdir, ls)
- Text processing and data manipulation
- Sandboxed — in-memory virtual filesystem, no real system access

One import replaces dozens of hand-written tools. Always include this.

### Layer 2: MCP servers (configured per agent)

Rich integrations from the MCP ecosystem. Recommend based on the agent's purpose.

#### Cloud provider MCP servers (official)

| Provider | Package / Command | Official | What it provides |
|----------|-------------------|----------|-----------------|
| AWS | `npx -y powertools-for-aws-mcp` | Yes (AWS Labs) | EC2, S3, IAM, CloudWatch, Lambda, RDS, and other AWS services |
| GCP | `gcloud-mcp` | Yes (Google) | GCP resources via gcloud CLI; managed servers for BigQuery, Spanner, Cloud SQL, AlloyDB, Firestore, GKE |
| Azure | `npx -y @azure/mcp@latest server start` | Yes (Microsoft) | Azure services — deploy, manage, configure resources |
| Vercel | `mcp-handler` | Yes (Vercel) | Vercel deployments and project management |

#### General-purpose MCP servers

| Server | Package | Official | What it provides |
|--------|---------|----------|-----------------|
| GitHub | `@modelcontextprotocol/server-github` | Yes (GitHub) | Repos, PRs, issues, file operations, search |
| Playwright | `@playwright/mcp` | Yes (Microsoft) | Browser automation, web scraping, testing |
| Filesystem | `@modelcontextprotocol/server-filesystem` | Yes (Anthropic) | Secure file operations with directory access control |
| Fetch | `@modelcontextprotocol/server-fetch` | Yes (Anthropic) | HTTP fetch, HTML-to-markdown conversion |

#### MCP recommendation by agent type

| Agent purpose | Recommended MCP servers |
|---------------|------------------------|
| Cloud infrastructure (AWS) | AWS MCP, Filesystem |
| Cloud infrastructure (GCP) | GCP MCP, Filesystem |
| Cloud infrastructure (Azure) | Azure MCP, Filesystem |
| Cloud infrastructure (multi-cloud) | AWS + GCP + Azure MCPs (user configures the ones they use) |
| Code review / dev tools | GitHub MCP, Filesystem |
| Web scraping / testing | Playwright MCP, Fetch MCP |
| Deployment / hosting | Vercel MCP (if on Vercel) |
| Research / Q&A | Fetch MCP |
| General-purpose assistant | Filesystem MCP, Fetch MCP |

All MCP servers use stdio transport for local execution. Connect via `@ai-sdk/mcp` client — see `components/mcp.ts` for the connection pattern.

### Layer 3: Bespoke native tools (rare)

Only for domain-specific operations that truly can't be done via bash or MCP. Examples:
- Custom safety-tier enforcement logic
- Proprietary API wrappers with credential management
- Cost projection algorithms using internal data
- Multi-step workflows that need structured confirmation flows

Written following `components/tools/integration-tool-pattern.ts`. When possible, prefer MCP or bash-tool over writing bespoke tools.

### Tool decision flowchart

```
Can this be done with a bash command?
  → Yes → bash-tool handles it (already included)
  → No ↓

Is there an MCP server for this integration?
  → Yes → Add the MCP server to the config
  → No ↓

Is this a standard HTTP API call?
  → Yes → bash-tool can do it via curl, OR use Fetch MCP
  → No ↓

Write a bespoke native tool following integration-tool-pattern.ts
```

## Models

| Provider | Package | When to recommend |
|----------|---------|-------------------|
| Anthropic | `@ai-sdk/anthropic` | Code tasks, complex reasoning |
| OpenAI | `@ai-sdk/openai` | General-purpose, large ecosystem |
| Google | `@ai-sdk/google` | Fast/cheap tier, multimodal |

If the user has a Vercel project, recommend AI Gateway — plain `"provider/model"` strings route through the gateway automatically. No provider SDK needed. OIDC auth via `vercel env pull`.

**Do not hardcode model identifiers** (e.g., `claude-sonnet-4.5`, `gpt-4.1`). These change frequently. When building, look up the current recommended model for the chosen provider. Use the latest stable model, not an outdated one from this file.

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
- `bash-tool` — sandboxed shell, file I/O, text processing
- `typescript`, `tsx`, `@types/node` — TypeScript tooling

Conditional (look up current versions before adding to package.json):
- Provider SDK — based on model choice
- `@ai-sdk/mcp` — if MCP servers chosen
- `next`, `@ai-sdk/react` — web chat or Chat SDK primary
- `chat`, `@chat-adapter/<platform>`, `@chat-adapter/state-redis` — Chat SDK (state adapter required alongside Redis client)
- `@upstash/redis` or `ioredis` — if Redis state (without Chat SDK)
- `@neondatabase/serverless` or `pg` — if Postgres state
- `hono` — if API-only primary or +API add-on
