# Interactive Mode — Browser UI

When the user opts for interactive mode, launch the bundled server runtime to provide a richer training interface. The browser handles presentation and input capture. The agent handles content generation and evaluation.

## Runtime Files

The runtime is in `scripts/` (relative to this skill's SKILL.md):

- **`scripts/interactive-server.mjs`** — zero-dependency Node.js server. Serves the HTML shell, relays browser interactions to stdout, pushes content updates via SSE.
- **`scripts/shell.html`** — HTML shell with React 19 + Babel standalone + Tailwind CDN. Provides `useContent()`, `sendResults()`, and `useKeyboard()` hooks.

## Launching the Server

1. Create a working directory for the session (e.g., `.train-ui/`)
2. Copy `scripts/shell.html` to `.train-ui/index.html`
3. Customize index.html:
   - Replace `{{TITLE}}` with the session title (e.g., "Train — React Hooks Quiz")
   - Replace `{/* AGENT: components */}` with generated React components (see below)
   - Add mode-specific CSS at `/* AGENT: additional styles */`
4. Write initial `content.json` to `.train-ui/`
5. Launch: `node scripts/interactive-server.mjs .train-ui/`
6. Wait for stdout: `{"type":"server_ready","port":3456,"dir":"..."}`
7. The server auto-opens the browser

## Content Contract

Write `.train-ui/content.json` with the batch data. The browser receives this via SSE (auto-updates when the file changes).

```json
{
  "batchNumber": 2,
  "mode": "quiz",
  "items": [
    {
      "id": "q1",
      "type": "mc",
      "question": "What does useEffect's cleanup function run?",
      "options": ["Before mount", "After every render", "Before re-run and on unmount", "Only on unmount"],
      "correctIndex": 2,
      "explanation": "The cleanup runs before each re-execution of the effect and when the component unmounts.",
      "concept": "useEffect-cleanup",
      "timeLimit": 15
    },
    {
      "id": "q2",
      "type": "fillin",
      "question": "The hook `________` lets you cache a computed value between renders.",
      "acceptedAnswers": ["useMemo", "useMemo()"],
      "explanation": "useMemo memoizes expensive computations, recomputing only when dependencies change.",
      "concept": "useMemo",
      "timeLimit": 10
    }
  ],
  "settings": {
    "showTimer": true,
    "showProgress": true,
    "showRunningScore": true
  }
}
```

## Generating React Components

The agent generates React components tailored to the mode and injects them into the shell. Components use the runtime hooks:

- **`useContent()`** — returns current content.json (auto-updates via SSE). Returns `null` before first load.
- **`sendResults(data)`** — sends interaction data to the agent. Adds timestamp automatically.
- **`useKeyboard(keyMap)`** — registers keyboard shortcuts. Ignores when focused on input/textarea.

The top-level component must be named `App`. The agent writes whatever components the mode needs — there are no pre-built templates. Generate components that match the session's specific requirements.

### Component Design Per Mode

**Quiz mode** — generate components for:
- Question card with MC options as clickable buttons, keyboard shortcuts (1-4)
- Fill-in-the-blank text input with Enter to submit
- Timer bar that counts down from `timeLimit`, auto-submits when expired
- Feedback flash: green/red border + explanation, 2-3 seconds, auto-advance
- Progress bar and running score

**Flashcard mode** — generate components for:
- Card with front/back content, click or Space to flip
- Rating buttons after flip: Easy (green) / Hard (yellow) / Again (red), keyboard 1/2/3
- Card counter and retry pile indicator
- Optional speed mode with auto-flip countdown

**Scenario mode** — generate components for:
- Scenario text with syntax-highlighted code blocks
- Large textarea for response, Submit button
- Optional timer (more generous: 60-120s)
- Evaluation display area (populated after agent reviews)

**Practice mode** — generate components for:
- Problem description panel
- Monospace textarea with tab-inserts-spaces, line numbers
- Submit for review button
- Feedback panel (populated after agent reviews)

**Shared requirements:**
- Dark mode (bg: #0a0a0a, zinc/neutral palette)
- Keyboard-first — every action possible without mouse
- Session header: topic, mode, difficulty, batch N of M
- Mobile-responsive: single column, large touch targets

## IO Protocol

```
Agent ──writes content.json──→ Server ──SSE push──→ Browser
Agent ←──reads stdout─────────  Server ←──POST /results── Browser
```

- **Browser → Agent:** Browser calls `sendResults({ questionId, answer, correct, timeMs })`. Server prints the JSON to stdout as a single line.
- **Batch complete:** Browser sends `sendResults({ type: "batch_complete", results: [...] })`. Agent reads this to know the batch is done.
- **Agent → Browser:** Agent writes/updates `content.json`. Server detects the change and pushes via SSE. Browser's `useContent()` hook auto-updates.

## Subagent Protocol

When the main agent spawns a subagent for a batch:

**Subagent receives:**
- Path to `.train-session.json` (state file)
- Path to the mode reference file
- Path to `.train-ui/content.json` (where to write batch content)
- Instruction: "Generate N items, write to content file, wait for batch_complete on stdout, return results"

**Subagent does:**
1. Reads state file → knows topic, difficulty, covered concepts, fingerprints
2. Reads mode reference → knows format rules
3. Generates N items, avoiding fingerprinted questions
4. Writes content.json (browser auto-updates via SSE)
5. Monitors stdout for `batch_complete`
6. Returns compact results to main agent

**Subagent returns:**
```json
{
  "batchNumber": 2,
  "results": [
    { "concept": "useEffect-cleanup", "correct": true, "timeMs": 4200, "type": "mc" },
    { "concept": "useMemo", "correct": false, "timeMs": 8100, "type": "fillin" },
    { "concept": "useCallback", "correct": true, "timeMs": 6300, "type": "mc" }
  ]
}
```

## Cleanup

When the session ends:
- Delete `.train-ui/` directory (ephemeral)
- Delete `.train-session.json` (ephemeral)
- Stop the server process
- Keep `.train-profile.json` (persistent, if tracking)

## Fallback

If anything goes wrong — server won't start, browser won't open, Node not available — fall back to terminal mode gracefully. The mode references work identically in both interfaces. The browser is an enhancement, not a requirement.
