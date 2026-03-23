---
name: render
description: >
  Create interactive, LLM-powered browser experiences — wizards, forms, chat interfaces,
  and conversational workflows rendered as React components in the browser. The agent designs
  the experience, generates custom components, launches a local server, and enters a conversation
  loop where browser input flows back through stdout for processing. Use when the user wants
  to build any browser-based interactive experience, UI prototype, wizard, questionnaire,
  or conversational tool. Triggers on "render me a", "create a wizard", "browser experience",
  "interactive form", "chat interface in the browser", "build me a UI for", "questionnaire",
  "onboarding flow", or any request for a browser-rendered interactive workflow.
---

# Render — LLM-Powered Browser Experiences

You create interactive browser experiences powered by the agent's own LLM capabilities.
The browser becomes your UI layer — React components render wizards, forms, markdown,
and chat interfaces, while user input flows back to you through stdout for processing.

## Architecture

```
User describes what they want
       ↓
  ┌──────────────────────┐
  │ 1. DESIGN            │  Understand the workflow, steps, and UX
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 2. GENERATE          │  Create workspace with runtime + components
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 3. LAUNCH            │  Install deps, start server, open browser
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 4. LOOP              │  Listen for input via stdout, process, update
  └──────────────────────┘
```

## Communication Protocol

The server runs as a background process. Communication flows through stdout and the filesystem:

```
Browser → POST /input → Server prints JSON to stdout → Agent reads via TaskOutput
                                                              ↓
                                                     Agent processes input
                                                              ↓
                                              Agent writes updated state.json
                                                              ↓
                              Server detects change (fs.watch) → SSE push → Browser re-renders
```

The server's stdout IS the message queue. Messages accumulate in the buffer — nothing
gets lost if the agent is busy. Re-entry after interruption is just "check TaskOutput."

### Stdout Events

```jsonl
{"type":"server_ready","port":3456,"dir":"/path/to/workspace"}
{"type":"user_input","ts":1711234567890,"data":{"step":"step-1","action":"submit","fields":{"name":"My App"}}}
{"type":"user_input","ts":1711234567891,"data":{"step":"step-2","action":"next"}}
```

---

## Phase 1: Design

Understand what the user wants to build. Identify which pattern (or combination) fits:

| Pattern | Description | Example |
|---------|-------------|---------|
| **Wizard** | Multi-step form with progress indicator | Onboarding, setup assistant |
| **Chat** | Message-based conversation with markdown | Interactive Q&A, chatbot |
| **Form → Response** | Fill a form, get AI-generated output | Report generator, analyzer |
| **Dashboard** | Multiple panels with data and controls | Monitoring, admin tool |

Ask (2-3 exchanges max — don't over-interview):

1. **What's the experience?** What does the user see and do?
2. **What are the steps/screens?** Input, output, and connections between them.
3. **What does the agent do?** At each step, what should you do with the input?

If the user gave a detailed description upfront, extract what you need and confirm
rather than re-asking everything.

### Design Output

Produce a brief spec and confirm:

```
## Experience: [name]

**Pattern:** Wizard (3 steps)

**Steps:**
1. Project Info — text inputs for name and description
2. Tech Selection — multi-select from options you generate based on step 1
3. Plan — you generate a project plan, rendered as markdown

**Agent behavior:**
- Step 1→2: Use input to generate technology options
- Step 2→3: Use selections to generate a detailed plan
```

Once confirmed, move to Phase 2.

---

## Phase 2: Generate

Create a workspace directory with runtime files and custom components.

### Workspace Structure

```
<experience-name>/
├── package.json      ← copied from runtime/
├── server.mjs        ← copied from runtime/
├── index.html        ← copied from runtime/shell.html, then customized
├── state.json        ← generated based on design
└── memory.json       ← agent's durable context (survives context compression)
```

### Step 1: Copy Runtime Files

The `runtime/` directory next to this SKILL.md contains the runtime files. Copy them
into the workspace:

1. Copy `runtime/server.mjs` → `<workspace>/server.mjs` (use as-is, no changes needed)
2. Copy `runtime/package.json` → `<workspace>/package.json` (use as-is)
3. Copy `runtime/shell.html` → `<workspace>/index.html` (customize in Step 2)

The server handles SSE, stdout printing, and state.json watching. Read
`references/runtime.md` if you need to understand how the server and shell work,
but you don't need to modify them.

### Step 2: Custom Components

This is the creative part. Edit `<workspace>/index.html` to add the experience:

1. Replace `{{TITLE}}` with the experience name
2. Add experience-specific CSS where the `/* AGENT: styles */` comment is
3. Generate React components and insert where the `{/* AGENT: components */}` comment is

The HTML shell provides utilities your components use:
- `useAppState()` — returns the current state from state.json (auto-updates via SSE)
- `sendInput(data)` — POSTs data to /input, which the agent reads from stdout
- `<Markdown content={text} />` — renders markdown string as styled HTML
- `<ThinkingIndicator />` — pulsing dots, show when `state.thinking` is true
- `<Loading />` — centered "Connecting..." screen, show when state is null

**Component patterns by experience type:**

**Wizard:**
```jsx
function App() {
  const state = useAppState();
  if (!state) return <Loading />;
  const step = state.steps[state.currentStep];
  return (
    <div className="wizard">
      <ProgressBar current={state.currentStep} total={state.totalSteps} />
      <StepContent step={step} />
      {state.thinking && <ThinkingIndicator />}
    </div>
  );
}
```

**Chat:**
```jsx
function App() {
  const state = useAppState();
  if (!state) return <Loading />;
  return (
    <div className="chat">
      <MessageList messages={state.messages} />
      {state.thinking && <ThinkingIndicator />}
      <ChatInput onSend={(text) => sendInput({ action: 'message', text })} />
    </div>
  );
}
```

Generate all the sub-components (ProgressBar, StepContent, MessageList, ChatInput, etc.)
with full styling. These are specific to the experience — don't use generic placeholders.

### Step 3: Initial State

Create `state.json` matching the experience pattern:

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
      "title": "Project Info",
      "status": "active",
      "content": null,
      "fields": {}
    }
  ],
  "messages": []
}
```

**Chat:**
```json
{
  "view": "chat",
  "thinking": false,
  "messages": [
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

The `thinking` field is universal — set to `true` before processing, `false` after.

### Step 4: Create memory.json

This is the agent's durable context — it survives context compression and lets you
re-orient after long sessions. Write it after the design phase:

```json
{
  "design": {
    "pattern": "wizard",
    "steps": ["Project Info", "Tech Selection", "Plan"],
    "agent_behavior": ["Generate tech options from project type", "Generate plan from selections"]
  },
  "key_facts": [],
  "summary": "",
  "conversation_turns": 0
}
```

- `design` captures the spec so you don't lose it during long loops
- `key_facts` accumulates important context the user shares during the loop
- `summary` gets written when context management kicks in (see Phase 4)
- `conversation_turns` tracks loop iterations

### Component Design Guidelines

- **Dark mode by default.** Backgrounds: #0a0a0a, #111, #1a1a1a. Text: #e5e5e5, #a3a3a3. Accent: one color, used sparingly. The shell already sets the base dark theme — add experience-specific styles in the `/* AGENT: styles */` section.
- **Use the shell utilities.** `<Markdown />` for LLM text, `<ThinkingIndicator />` for loading, `<Loading />` for initial state. Don't re-implement these.
- **Self-contained.** No component libraries. Style in the `/* AGENT: styles */` section. The experience ships as one HTML file plus the server.
- **Responsive.** Flexbox, `max-width` containers, relative units. Works 400px–1400px.
- **Transitions.** CSS transitions for step changes and content appearing. Smooth opacity/transform, nothing flashy.

---

## Phase 3: Launch

### Step 1: Install

```bash
cd <workspace> && npm install
```

### Step 2: Start Server

Run with `run_in_background: true`:

```bash
cd <workspace> && node server.mjs
```

### Step 3: Verify

Read background task output. Confirm `server_ready` event. Tell the user:

> "Server running at http://localhost:<port>. Open it in your browser."

If agent-browser tools are available, take a screenshot to verify the initial render.

---

## Phase 4: Conversation Loop

### The Loop

```
1. Read background task output (TaskOutput) for new user_input events
2. If no new input → wait briefly, check again
3. If new input:
   a. Read current state.json
   b. Write state.json with thinking: true
   c. Process the input based on the design
   d. Write state.json with the response + thinking: false
4. Go to 1
```

### Processing by Pattern

**Wizard — step submission:**
1. Read submitted fields from the input event
2. Generate content for the next step (or final output) — you're the LLM, just think and write
3. Update state: advance `currentStep`, set next step to `active`, write generated content
4. On last step: generate final output, mark wizard complete

**Chat — new message:**
1. Read the user's message from the input event
2. Generate a response
3. Append both the user message and your response to `state.messages`

**Form → Response:**
1. Read all form fields from the input event
2. Generate the response
3. Write to `state.response`

### Updating State

Always follow this pattern when writing state.json:

1. Read current state.json (it may have changed since you last wrote it)
2. Merge your changes into the current state
3. Write the complete updated state.json

Never write a partial state — always write the full object. The SSE push sends
the entire state to the browser.

### Streaming Responses (Chat Pattern)

For chat experiences, don't make the user wait for a complete response. Write
incrementally:

1. Append the user message + an empty assistant message to `state.messages`
2. Set `state.thinking = true`
3. As you generate your response, periodically update the assistant message's
   `content` field with what you have so far (every sentence or natural break point)
4. Each write triggers an SSE push — the browser re-renders with the partial text
5. Set `state.thinking = false` when done

The browser component should render the last assistant message normally even while
`thinking` is true — the pulsing dots appear alongside the growing text.

### Back / Undo (Wizard Pattern)

Handle `action: "back"` events from the browser:

1. Read the current state
2. Decrement `currentStep`
3. Set the previous step back to `"active"`, current step back to `"pending"`
4. Preserve the previous step's `fields` so the user sees their earlier input
5. Write the updated state

The browser component should include a Back button on every step except the first.
Wire it to: `sendInput({ action: 'back' })`.

### Branching Wizards

For wizards where the next step depends on user choices, use a `nextStep` field
instead of always incrementing `currentStep`:

```json
{
  "steps": [
    { "id": "intro", "title": "About You", "nextStep": null },
    { "id": "dev-path", "title": "Developer Setup", "nextStep": null },
    { "id": "designer-path", "title": "Designer Setup", "nextStep": null },
    { "id": "summary", "title": "Summary", "nextStep": null }
  ]
}
```

When processing a step submission:
1. Look at the submitted data to decide which step comes next
2. Set `currentStep` to the index of the target step (or use step IDs and resolve)
3. The agent decides the branch — not the browser. The browser just sends the data.

### Context Management

Long loops fill the agent's context window. Use `memory.json` to stay oriented.

**During the loop:**
- After each input processed, increment `memory.json.conversation_turns`
- When the user shares something important (a preference, constraint, correction),
  add it to `key_facts`
- Every ~5 turns, update `summary` with a brief recap of what's happened

**When context gets long (~15-20 turns):**

Ask the user:

> "We've been going a while. Here's what I plan to carry forward — anything
> to add or drop?"
>
> **Carrying forward:** [list key_facts + summary]

Let the user adjust. Write the refined context to `memory.json`.

**After context compression:**

If your context has been compressed (you notice you've lost earlier details),
read `memory.json` + `state.json` to fully re-orient:
1. `memory.json` tells you the design, key facts, and summary
2. `state.json` tells you the current UI state
3. Resume the loop from where you left off

### Composite Patterns

Patterns can be mixed. Common combinations:

- **Wizard with a chat step** — one wizard step is a free-form conversation
  (e.g., "discuss your requirements"). The step's content area renders a mini
  chat. The state for that step includes a `messages` array. When the user
  clicks Next, the agent summarizes the conversation and moves on.
- **Form → Response with follow-up chat** — after generating the report, switch
  to a chat view where the user can ask questions about it. Update `state.view`
  from `"form-response"` to `"chat"` and carry the report context forward.

The browser components should check `state.view` or `step.type` to render the
right UI for each section.

### Handling Interruptions

If the user talks to you in the terminal during the loop:
- Handle their request
- Then re-enter: "Let me check for browser input I may have missed..."
- Read TaskOutput to catch up on events that arrived

### Ending the Session

The loop ends when:
- The user says they're done ("stop", "close", "done")
- The workflow completes naturally (wizard finished, task done)

On exit:

> "Experience complete. Workspace at `<path>`. Want to keep it or clean up?"

If clean up: remove the workspace. If keep: leave it — `npm start` relaunches.

---

## Edge Cases

**Port conflict:** Pass `PORT=<number>` env var to the server. Start at 3456, increment if taken.

**npm not found:** Try `pnpm`, `yarn`, or `bun`. Check what's available in the environment.

**Multiple rapid inputs:** All events buffer in stdout. Process them in order.

**Long generation:** Set `thinking: true` FIRST, then generate. The user sees the indicator immediately.

**User modifies files directly:** Fine. Server watches state.json regardless of writer. HTML edits need a browser refresh.

**Large state (100+ chat messages):** SSE pushes the entire state.json on every change. If state grows large, consider trimming older messages from `state.messages` while preserving them in `memory.json.summary`. Keep the last ~20 messages in state for display; summarize the rest.

**Dynamic component updates mid-loop:** If the experience needs a new component type during the loop (e.g., a chart that wasn't in the original design), edit index.html and tell the user to refresh. The state persists across refreshes — only the components change.

---

## Response Style

- No filler. No "Great idea!" or "That's a wonderful experience!"
- During design: conversational but focused. Get the spec, confirm, move on.
- During generation: show what you're creating concisely.
- During the loop: minimal terminal output. The browser IS the interface.
- When processing input: don't narrate in the terminal. Just update state.
