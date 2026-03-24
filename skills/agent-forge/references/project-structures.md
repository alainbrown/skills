# Project Structures

Every project has the same agent core (agent.ts + tools/). Interface files are added on top. This file defines **directory layouts and structural patterns** — not exact file contents.

## Base Structure (always present)

```
<agent-name>/
├── src/
│   ├── agent.ts          # Agent definition + system prompt
│   ├── tools/
│   │   ├── index.ts      # Tool exports + optional MCP merge
│   │   └── <tool>.ts     # One file per native tool
│   └── mcp.ts            # MCP client setup (only if MCP tools chosen)
├── package.json
├── tsconfig.json
└── README.md
```

## Interface Files Added Per Choice

| Choice | Files added |
|--------|-----------|
| CLI (primary or add-on) | `src/cli.ts` |
| API-only (primary or add-on) | `src/server.ts` |
| Web chat | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/api/chat/route.ts`, `next.config.ts`, `src/components/` (AI Elements via npx) |
| Chat SDK | `src/lib/bot.ts`, `src/app/api/bot/<platform>/route.ts` (per platform), `src/app/layout.tsx` (minimal), `next.config.ts` |

Note: For Next.js projects (web chat, Chat SDK), `agent.ts`, `tools/`, and `mcp.ts` all move under `src/lib/` since Next.js uses `src/app/` for routing. Adjust import paths accordingly — e.g., `cli.ts` at `src/cli.ts` imports from `./lib/agent`, not `./agent`.

## Example Layouts

### CLI Agent

```
code-helper/
├── src/
│   ├── agent.ts
│   ├── tools/
│   │   ├── index.ts
│   │   ├── readFile.ts
│   │   ├── writeFile.ts
│   │   └── shellExec.ts
│   └── cli.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Web Chat Agent

```
research-assistant/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── api/chat/route.ts
│   ├── lib/
│   │   ├── agent.ts
│   │   └── tools/
│   │       ├── index.ts
│   │       └── webSearch.ts
│   ├── components/       # AI Elements (via npx ai-elements)
│   └── cli.ts            # Add-on: local testing
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

### Slack Bot with CLI Add-on

```
pr-review-agent/
├── src/
│   ├── lib/
│   │   ├── agent.ts
│   │   ├── bot.ts
│   │   └── tools/
│   │       ├── index.ts
│   │       ├── readFile.ts
│   │       └── analyzeDiff.ts
│   ├── mcp.ts
│   ├── cli.ts
│   └── app/api/bot/slack/route.ts
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

### Multi-platform Bot

```
support-agent/
├── src/
│   ├── lib/
│   │   ├── agent.ts
│   │   ├── bot.ts
│   │   └── tools/
│   │       ├── index.ts
│   │       ├── searchDocs.ts
│   │       └── createTicket.ts
│   ├── cli.ts
│   └── app/api/bot/
│       ├── slack/route.ts
│       ├── discord/route.ts
│       └── telegram/route.ts
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

### API-only Agent

```
data-agent/
├── src/
│   ├── agent.ts
│   ├── tools/
│   │   ├── index.ts
│   │   ├── queryDB.ts
│   │   └── formatReport.ts
│   ├── server.ts
│   └── cli.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Package Scripts

| Interface | Scripts |
|-----------|---------|
| CLI (primary) | `"start": "tsx src/cli.ts"`, `"dev": "tsx watch src/cli.ts"` |
| Web chat | `"start": "next start"`, `"dev": "next dev"`, `"build": "next build"` |
| Chat SDK | `"start": "next start"`, `"dev": "next dev"`, `"build": "next build"` |
| API-only | `"start": "tsx src/server.ts"`, `"dev": "tsx watch src/server.ts"` |
| CLI add-on | `"cli": "tsx src/cli.ts"` (additional script) |
| API add-on | `"api": "tsx src/server.ts"` (additional script) |
| Deployment | `"deploy": "<platform deploy command>"` |

## Deployment Config

Generate minimal config for the chosen platform. Look up current config format before writing — these change.

**Vercel** — Most Next.js projects need no config file. Only generate `vercel.json` if custom function settings are needed (e.g., extended timeout for AI streaming). Look up current `vercel.json` schema.

**Docker** — Dockerfile pattern is stable:
```
FROM node:<current-lts>-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```
Use the current Node.js LTS version (look up, don't hardcode).

**Fly.io** — Look up current `fly.toml` schema. Core shape: app name, primary region, build section pointing to Dockerfile, http_service with internal port and force_https.

**Railway** — Typically needs no config file. Railway auto-detects Node.js projects. Document the deploy command in the README.

## TypeScript Config

Generate `tsconfig.json` appropriate for the project type:

- **CLI / API-only** — target ES2022, Node16 module resolution, strict mode
- **Next.js (web chat, Chat SDK)** — use the tsconfig generated by the framework. Do not write a custom one.

Look up current recommended tsconfig settings for the chosen framework.
