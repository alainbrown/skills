# Render Runtime — Architecture Reference

This document explains how the runtime works. The actual code lives in `runtime/`
next to the SKILL.md — you copy those files into each workspace, you don't generate them.

---

## Server (`runtime/server.mjs`)

A thin Express bridge between the browser and the agent. Does three things:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Serves index.html (and all static files in the workspace) |
| `/state.json` | GET | Serves current state as a static file |
| `/events` | GET | SSE stream — pushes state.json contents to browser on every change |
| `/input` | POST | Receives JSON from browser, prints it to stdout as a JSON line |

### Key behaviors

- **SSE on connect:** When a browser connects to `/events`, the server immediately sends
  the current state.json so the UI renders without waiting for an update.
- **File watching:** Uses `watchFile` with a 200ms interval on state.json. When the file
  changes (i.e., the agent writes new state), it reads, validates JSON, and pushes to
  all connected SSE clients. Invalid JSON (mid-write) is silently skipped.
- **Stdout protocol:** Every POST to `/input` prints a single JSON line to stdout:
  ```jsonl
  {"type":"user_input","ts":1711234567890,"data":{...request body...}}
  ```
  The agent reads this from the background task output.
- **Startup event:** On listen, prints:
  ```jsonl
  {"type":"server_ready","port":3456,"dir":"/path/to/workspace"}
  ```
- **Port:** Defaults to 3456. Override with `PORT` env var.
- **Graceful shutdown:** Handles SIGTERM.

---

## HTML Shell (`runtime/shell.html`)

A single HTML file with React 18 + Babel standalone + marked.js loaded from CDN.
Provides utility components and hooks that all experiences use.

### Provided utilities

| Utility | Type | Purpose |
|---------|------|---------|
| `useAppState()` | Hook | Returns the current state from state.json. Auto-updates via SSE. Returns `null` until first load. |
| `sendInput(data)` | Function | POSTs data to `/input`. Server prints it to stdout for the agent. |
| `<Markdown content={text} />` | Component | Renders a markdown string as styled HTML using marked.js. |
| `<ThinkingIndicator />` | Component | Three pulsing blue dots. Show when `state.thinking` is true. |
| `<Loading />` | Component | Centered "Connecting..." screen. Show when `useAppState()` returns null. |

### Customization points

The shell has three clearly marked sections the agent edits after copying:

1. **`{{TITLE}}`** — Replace with the experience name (in the `<title>` tag)
2. **`/* AGENT: styles */`** — Insert experience-specific CSS here (in the `<style>` block)
3. **`{/* AGENT: components */}`** — Insert all React components here (in the `<script type="text/babel">` block)

The top-level component must be named `App`. It gets mounted automatically
by the `ReactDOM.createRoot` call at the bottom of the script.

### Base styles included

The shell ships with:
- CSS reset (box-sizing, margin, padding)
- Dark theme body (background: #0a0a0a, color: #e5e5e5)
- System fonts (sans-serif for UI, monospace for code)
- Markdown styles (headings, lists, code blocks, blockquotes, links)
- Thinking indicator animation (pulse keyframes)

The agent adds experience-specific styles on top of these.

---

## state.json

The state file is the communication contract between the agent and the browser.
The agent writes it; the browser reads it (via SSE push).

### Universal fields

Every state.json must include:
- `"thinking": boolean` — when true, the browser shows a loading indicator

### Pattern-specific shapes

**Wizard:**
```json
{
  "view": "wizard",
  "currentStep": 0,
  "totalSteps": 3,
  "thinking": false,
  "steps": [
    {
      "id": "step-1",
      "title": "Step Title",
      "description": "What this step collects",
      "status": "active",
      "content": null,
      "fields": {}
    }
  ],
  "messages": []
}
```
- Step `status`: `"pending"`, `"active"`, or `"completed"`
- `content`: agent-generated markdown for the step (null until generated)
- `fields`: user-submitted form values
- `nextStep` (optional): step ID for branching wizards — agent sets this when processing input

**Chat:**
```json
{
  "view": "chat",
  "thinking": false,
  "messages": [
    { "role": "assistant", "content": "Welcome message." }
  ]
}
```
- Messages have `role` ("user" or "assistant") and `content` (markdown string)

**Form → Response:**
```json
{
  "view": "form-response",
  "thinking": false,
  "form": { "submitted": false, "fields": {} },
  "response": null
}
```
- `response`: agent-generated markdown after form submission

### State update rules

1. Always read current state.json before writing (it may have changed)
2. Merge changes into the current state
3. Write the complete object — never partial state
4. The SSE push sends the entire state to the browser

---

## memory.json

The agent's durable context file. NOT sent to the browser — only the agent reads/writes it.
Survives context compression so the agent can re-orient after long sessions.

```json
{
  "design": {
    "pattern": "wizard",
    "steps": ["Step 1 name", "Step 2 name"],
    "agent_behavior": ["What agent does at each transition"]
  },
  "key_facts": [
    "User prefers minimal tooling",
    "Report should include folder structure"
  ],
  "summary": "User completed steps 1-2. Chose React + Vite. Prefers TypeScript.",
  "conversation_turns": 14
}
```

| Field | Purpose | When to update |
|-------|---------|----------------|
| `design` | The experience spec from Phase 1 | Once, after design is confirmed |
| `key_facts` | Important context the user shares during the loop | When user reveals preferences, constraints, corrections |
| `summary` | Running recap of what's happened | Every ~5 turns, and when context management triggers |
| `conversation_turns` | Loop iteration counter | After each input processed |

### Context management flow

1. Agent tracks `conversation_turns` during the loop
2. At ~15-20 turns, agent asks the user what to carry forward
3. User adjusts — agent writes refined summary + key_facts
4. After context compression: read `memory.json` + `state.json` to re-orient
5. For chat with 100+ messages: trim `state.messages` to last ~20, preserve earlier content in `memory.json.summary`
