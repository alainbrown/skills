# Interface Templates

Each interface is a thin wrapper that imports the agent core and exposes it through a different front door. This file describes the **structure and responsibilities** of each interface — not exact code.

**Before writing any interface,** verify current APIs via documentation tools if available. If not, use training knowledge but flag fragile patterns (see below).

### Known fragile patterns

Interface code is the **most fragile** part of the generated project. These patterns change frequently:

**AI SDK / React hooks:**
- `useChat` API — transport pattern vs direct `api` parameter. Config options change between versions.
- `sendMessage` vs `handleSubmit` — the method for sending messages has been renamed.
- `status` vs `isLoading` — how to check streaming state has changed.
- `message.parts` vs `message.content` — how message content is accessed changes.
- `toUIMessageStreamResponse` vs `toDataStreamResponse` — the correct server response helper changes.
- `convertToModelMessages` — may or may not be async depending on version.

**Chat SDK:**
- Adapter constructor signatures — credential field names change.
- Event handler names — `onNewMention`, `onSubscribedMessage` etc. may be renamed.
- `thread.post()` — how streaming is passed to threads may change.

**Next.js:**
- Font imports — `next/font` vs `geist/font` patterns change.
- `middleware.ts` vs `proxy.ts` — file name has changed in recent versions.
- Request APIs — `cookies()`, `headers()` may require `await` in newer versions.

**AI Elements:**
- Component names and props — verify via `npx ai-elements` which installs current versions.
- Do not write AI Elements components by hand — always install via CLI.

If documentation tools are unavailable, flag these with `// TODO: verify` comments so the user can check.

## CLI (`src/cli.ts`)

**Responsibility:** readline loop → agent.generate() → print result

**Structure:**
1. Import readline from `node:readline/promises`
2. Import agent — path depends on project layout: `./agent` for CLI-primary projects, `./lib/agent` for Next.js projects where agent.ts lives under `src/lib/`
3. Create readline interface on stdin/stdout
4. Print startup message
5. Loop: read input → skip empty → call `agent.generate({ prompt: input })` → print text
6. Handle Ctrl+C gracefully

**Streaming variant:** Instead of `agent.generate()`, use `agent.stream()` and iterate over `textStream`, writing each chunk to stdout. Better UX for slow responses.

**Lines of code:** ~15-20. This is the simplest interface.

## API (`src/server.ts`)

**Responsibility:** HTTP POST endpoint → agent.stream() → streamed response

**Structure:**
1. Import a lightweight HTTP framework (`hono` recommended, or `express`)
2. Import agent from `./agent`
3. Define POST route (e.g., `/api/agent`)
4. Parse `{ prompt }` from request body
5. Call `agent.stream({ prompt })`
6. Return streamed response
7. Add a GET `/health` endpoint
8. Start server on configurable port (default 3000)

**Look up:** Current Hono or Express patterns for streaming responses. If using AI SDK's `toTextStreamResponse()`, verify the current method name.

**Lines of code:** ~20-25.

## Web Chat (Next.js App Router)

**Responsibility:** Full chat UI with streaming, backed by an API route that calls the agent.

**Three files:**

### API Route (`src/app/api/chat/route.ts`)

**Structure:**
1. Import agent and AI SDK streaming utilities
2. POST handler: parse messages from request body
3. Convert UI messages to model messages (async in v6+)
4. Call agent or streamText with the model messages
5. Return UI message stream response

**Look up before writing:**
- Current `convertToModelMessages()` signature (async in v6)
- Current `toUIMessageStreamResponse()` vs `toDataStreamResponse()` — the correct one changes between versions
- Or: current `createAgentUIStreamResponse()` for agent-based routes — may be simpler
- Current UIMessage type structure

### Chat Page (`src/app/page.tsx`)

**Structure:**
1. `'use client'` directive
2. Import `useChat` from `@ai-sdk/react`
3. Import AI Elements components (Message, Conversation) — installed via `npx ai-elements`
4. Call `useChat()` — returns messages, sendMessage, status
5. Render Conversation wrapper with Message components for each message
6. Add input area (PromptInput from AI Elements or custom)

**Look up before writing:**
- Current `useChat` API (transport pattern in v6, not `api` parameter)
- Current AI Elements component names and props
- Whether `DefaultChatTransport` is needed or if defaults work

### Layout (`src/app/layout.tsx`)

**Structure:**
1. Import metadata type from Next.js
2. Import font (Geist Sans/Mono recommended)
3. Import global CSS
4. Set metadata (title from agent name, description from agent description)
5. Render html with `className="dark"` + body with font classes

**Look up:** Current `next/font` import patterns — these change between Next.js versions.

### AI Elements Installation

After generating the web chat files, run:
```
npx ai-elements@latest add message conversation prompt-input
```

This installs the components into `src/components/ai-elements/`. Do not write these components by hand — they are maintained upstream and handle streaming, markdown, tool calls, and message parts.

## Chat SDK (Slack/Discord/Telegram/Multi-platform)

**Responsibility:** Webhook routes + Chat SDK bot that calls the agent on events.

**Two files (minimum):**

### Bot Setup (`src/lib/bot.ts`)

**Structure:**
1. Import Chat class from `chat`
2. Import platform adapter(s) from `@chat-adapter/<platform>`
3. Import state adapter from `@chat-adapter/state-redis`
4. Import agent from `./agent`
5. Create platform adapter instances with env var credentials
6. Create Chat instance with adapters map and state
7. Register event handlers:
   - `onNewMention` — agent responds when mentioned
   - `onSubscribedMessage` — agent responds to thread replies
   - Optionally: `onAction`, `onSlashCommand`
8. In each handler: call `agent.stream({ prompt })` then `thread.post(result.textStream)`

**Look up before writing:**
- Current Chat SDK adapter constructor signatures
- Current event handler names and callback shapes
- Current `thread.post()` API for streaming
- Current state adapter API

### Webhook Route (`src/app/api/bot/<platform>/route.ts`)

**Structure:**
1. Import bot from `@/lib/bot`
2. POST handler: delegate to `bot.webhooks.<platform>(req, { waitUntil })`

One route file per platform. All follow the same pattern.

**Look up:** Current webhook handler signature — particularly `waitUntil` handling.

### Multi-platform

Same bot instance, multiple adapters in the adapters map, one webhook route per platform. The agent logic is identical — only the adapters differ.

## Environment Variables by Interface

Each interface needs different credentials. Record these in `agent-forge.json` stage 7 (`envVars`).

| Interface | Required env vars |
|-----------|------------------|
| CLI | Model provider API key only |
| API | Model provider API key, PORT (optional) |
| Web chat | Model provider API key (or OIDC for AI Gateway) |
| Slack | SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, REDIS_URL, model API key |
| Discord | DISCORD_APP_ID, DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN, REDIS_URL, model API key |
| Telegram | TELEGRAM_BOT_TOKEN, REDIS_URL, model API key |
