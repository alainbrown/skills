# agent-forge.json Schema

This file is the single source of truth for all decisions. It is read by subagents during scaffolding — they receive no other conversation context. Every field a subagent needs to generate code must be present here.

## Full Schema

```json
{
  "phase": "design | scaffold | complete",
  "currentStage": 3,

  "agent": {
    "name": "pr-review-agent",
    "description": "A code review agent that analyzes PRs for bugs, security issues, and style violations",
    "systemPrompt": "You are a senior code reviewer with expertise in TypeScript and security. When reviewing code:\n\n1. Check for bugs and logic errors first\n2. Flag security vulnerabilities (injection, XSS, auth bypass)\n3. Note style issues only if they affect readability\n4. Be direct — state the issue, the risk, and how to fix it\n5. Don't nitpick formatting or naming unless it causes confusion\n\nYou refuse to: write code (only review), approve without reviewing, or review non-code files."
  },

  "context": {
    "summary": "PR review bot for a 6-person TypeScript team. Team is mostly junior — agent should explain issues, not just flag them. Previous attempt with Copilot was too noisy. Agent tone should be direct but educational.",
    "intent": "Catch bugs and security issues before human review, reduce review cycle time",
    "audience": "Junior-to-mid TypeScript developers, internal team",
    "style": "Direct, educational, no snark. Explain the 'why' behind each issue.",
    "futureConsiderations": "Monorepo support later. May add GitHub Actions trigger."
  },

  "stages": {
    "1": {
      "id": "purpose",
      "status": "completed",
      "decisions": {
        "purpose": "Analyze GitHub PRs for bugs, security issues, and style problems",
        "audience": "developers",
        "constraints": "Review only, never write code. Direct tone, no fluff.",
        "persona": "Senior code reviewer, TypeScript + security expert"
      }
    },
    "2": {
      "id": "interface",
      "status": "completed",
      "decisions": {
        "primary": "slack",
        "primaryPlatforms": ["slack"],
        "addons": ["cli"],
        "rationale": "Team uses Slack for PR notifications. CLI for local testing."
      }
    },
    "3": {
      "id": "tools",
      "status": "completed",
      "decisions": {
        "native": [
          {
            "name": "readFile",
            "description": "Read file contents from the repo",
            "inputSchema": { "path": "string" },
            "executeSummary": "fs.readFile at the given path"
          },
          {
            "name": "analyzeDiff",
            "description": "Parse a unified diff and extract changed lines with context",
            "inputSchema": { "diff": "string" },
            "executeSummary": "Parse unified diff format, return structured changes"
          }
        ],
        "mcp": [
          {
            "name": "github",
            "server": "@modelcontextprotocol/server-github",
            "transport": "stdio",
            "purpose": "PR diffs, file contents, post review comments"
          }
        ]
      }
    },
    "4": {
      "id": "model",
      "status": "completed",
      "decisions": {
        "provider": "anthropic",
        "model": "claude-sonnet-4.5 (illustrative — use current recommended model at scaffolding time)",
        "package": "@ai-sdk/anthropic",
        "gateway": false,
        "stopWhen": "stepCountIs(10)",
        "prepareStep": null
      }
    },
    "5": {
      "id": "durability",
      "status": "completed",
      "decisions": {
        "type": "ephemeral",
        "agent": "ToolLoopAgent",
        "rationale": "Short-lived review tasks, no need for crash recovery"
      }
    },
    "6": {
      "id": "state",
      "status": "completed",
      "decisions": {
        "type": "redis",
        "package": "@upstash/redis",
        "rationale": "Chat SDK requires Redis for multi-instance state"
      }
    },
    "7": {
      "id": "deployment",
      "status": "completed",
      "decisions": {
        "platform": "vercel",
        "config": "vercel.json",
        "rationale": "Next.js host for Chat SDK webhook routes",
        "envVars": [
          { "name": "ANTHROPIC_API_KEY", "purpose": "Model provider auth", "source": "Anthropic dashboard" },
          { "name": "SLACK_BOT_TOKEN", "purpose": "Slack bot auth", "source": "Slack app settings" },
          { "name": "SLACK_SIGNING_SECRET", "purpose": "Webhook verification", "source": "Slack app settings" },
          { "name": "REDIS_URL", "purpose": "Chat SDK state", "source": "Upstash dashboard" }
        ]
      }
    }
  },

  "dependencies": {
    "2": ["1"], "3": ["1"], "4": ["1", "3"],
    "5": ["1", "2"], "6": ["2", "5"], "7": ["2", "5"]
  }
}
```

## Field Reference

### Top-level

| Field | Type | Purpose |
|-------|------|---------|
| `phase` | `"design" \| "scaffold" \| "complete"` | Current workflow phase |
| `currentStage` | `number` | Active stage during design phase |
| `agent.name` | `string` | Project directory name (kebab-case) |
| `agent.description` | `string` | One-line summary — used in README and package.json |
| `agent.systemPrompt` | `string` | Complete system prompt — the agent's brain. Written verbatim into `instructions` during scaffolding. |

### Context

Free-form conversational context that doesn't fit into stage decisions. Updated incrementally during the design phase — whenever the user says something that informs the project but isn't a stage decision, capture it here. Subagents read this to make better micro-decisions (README tone, code comments, error messages, naming).

| Field | Type | Purpose |
|-------|------|---------|
| `context.summary` | `string` | 2-3 sentence distillation of the project background — who, what, why, any prior attempts |
| `context.intent` | `string` | The higher-level goal behind building this agent (not what it does, but why it matters) |
| `context.audience` | `string` | More detail on the audience than stage 1 captures — skill level, expectations, how they'll interact |
| `context.style` | `string` | Desired tone, voice, and communication style — for both the agent and the generated project (README, comments) |
| `context.futureConsiderations` | `string` | Things the user mentioned wanting eventually but explicitly out of scope now. Subagents should not implement these but can structure code to not block them. |

All context fields are optional. Only populate what the conversation actually reveals — don't fabricate context.

**What context is NOT:**
- Not a conversation transcript — distill, don't dump
- Not a duplicate of stage decisions — if it fits a stage field, put it there
- Not speculation — only capture what the user actually said or implied

### Stage decisions

Each stage has `id`, `status`, and `decisions`. Status values: `pending`, `active`, `completed`, `skipped`, `invalidated`.

**Stage 1 — Purpose:**

| Field | Purpose |
|-------|---------|
| `purpose` | What the agent does (1-2 sentences) |
| `audience` | Who uses it (developers, team, end users) |
| `constraints` | What the agent should refuse or avoid |
| `persona` | Role and expertise summary |

**Stage 2 — Interface:**

| Field | Purpose |
|-------|---------|
| `primary` | Primary interface type: `cli`, `web-chat`, `slack`, `discord`, `telegram`, `multi-platform`, `api-only` |
| `primaryPlatforms` | For Chat SDK: which platforms (e.g., `["slack", "discord"]`) |
| `addons` | Array of add-ons: `["cli"]`, `["api"]`, `["cli", "api"]`, or `[]` |
| `rationale` | Why this interface was chosen |

**Stage 3 — Tools:**

| Field | Purpose |
|-------|---------|
| `native` | Array of native tool specs: name, description, inputSchema (key→type), executeSummary |
| `mcp` | Array of MCP server specs: name, server package, transport type, purpose |

Native tool `inputSchema` is simplified (key→type pairs) — subagents generate the full Zod schema from this. `executeSummary` describes what the execute function does in plain English — subagents write the implementation from this.

**Stage 4 — Model:**

| Field | Purpose |
|-------|---------|
| `provider` | Provider name (anthropic, openai, google) |
| `model` | Model identifier |
| `package` | npm package for the provider SDK |
| `gateway` | `true` if using AI Gateway (no provider SDK needed) |
| `stopWhen` | Stop condition expression (e.g., `"stepCountIs(10)"`) |
| `prepareStep` | Description of prepareStep logic, or `null` |

**Stage 5 — Durability:**

| Field | Purpose |
|-------|---------|
| `type` | `"ephemeral"` or `"durable"` |
| `agent` | `"ToolLoopAgent"` or `"DurableAgent"` |
| `rationale` | Why this choice |

**Stage 6 — State:**

| Field | Purpose |
|-------|---------|
| `type` | `"in-memory"`, `"filesystem"`, `"redis"`, `"postgres"` |
| `package` | npm package, or `null` for in-memory |
| `rationale` | Why this choice |

**Stage 7 — Deployment:**

| Field | Purpose |
|-------|---------|
| `platform` | `"vercel"`, `"railway"`, `"fly"`, `"docker"`, `"skip"` |
| `config` | Config file name, or `null` |
| `rationale` | Why this choice |
| `envVars` | Array of env vars: name, purpose, where to get the value |

## What Subagents Need

Each subagent reads the full `agent-forge.json` but focuses on specific stages:

| Subagent | Primary stages | Key fields |
|----------|---------------|------------|
| Agent Core + Tools | 1, 3, 4, 5 | `agent.systemPrompt`, `context.style`, `stages.3.decisions` (tools), `stages.4.decisions` (model), `stages.5.decisions.agent` (loop type) |
| Interface Layer | 2 | `stages.2.decisions` (primary, platforms, addons), `agent.name`, `context.style` |
| Package + Deploy | 2, 3, 4, 6, 7 | All `decisions.package` fields, `stages.7.decisions` (deploy), `stages.6.decisions` (state), `agent.name`, `agent.description`, `context` (full — informs README tone, env var descriptions) |
