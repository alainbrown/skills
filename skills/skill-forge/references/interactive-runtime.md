# Interactive Browser UI

Guidance for adding browser-based interaction to skills. Read this when the user confirms their skill would benefit from browser interaction (timed responses, click-based input, code editing, visual feedback).

## Adding interactive mode to a skill

1. **Copy the runtime** from `scripts/runtime/` (relative to the skill-forge SKILL.md) into the new skill's `scripts/` directory. Copy both files:
   - `interactive-server.mjs` — zero-dependency Node.js server (SSE + stdout relay)
   - `shell.html` — HTML shell with React 19 + Babel standalone + Tailwind CDN

2. **Generate `references/interactive.md`** for the skill describing:
   - What content.json looks like for this skill (the data contract)
   - What React components the agent should generate (describe the UX, not the code)
   - The subagent batch pattern if the skill has long sessions
   - How the skill should customize shell.html (replace `{{TITLE}}`, inject components at the `{/* AGENT: components */}` marker, add styles at `/* AGENT: additional styles */`)

3. **Add interactive mode to the skill's flow** — typically as an optional enhancement in the training/interaction phase, with terminal as the default fallback

## How the runtime works

The server is content-agnostic. It serves whatever the agent writes and relays whatever the browser sends:

- Agent writes `content.json` → server pushes to browser via SSE
- Browser renders agent-generated React components (compiled by Babel in-browser)
- User interacts → browser POSTs to `/results` → server prints to stdout → agent reads
- Server prints `{"type":"server_ready","port":NNNN}` on startup

The agent generates React components specific to the skill's needs — quiz cards, flashcards, form wizards, diff viewers, anything. The runtime renders them. No pre-built components to maintain.

**The key principle:** Each skill ships its own copy of the runtime. Skills are independently installable — a user may install only one skill. Never reference another skill's files at runtime.

## Interactive test cases

If the skill has browser interaction (check for `scripts/interactive-server.mjs` and `references/interactive.md`), add 1-2 additional test cases where the user explicitly requests browser mode. These test whether the agent correctly sets up the interactive session — tool calls, file writes, generated components — not just conversation quality.

### Additional rubric criteria

Add these to the rubric alongside the standard criteria:

| Criterion | What it grades |
|-----------|---------------|
| Uses bundled runtime | Copies shell.html + launches interactive-server.mjs, not generating a server from scratch |
| Correct setup sequence | mkdir → cp shell → edit title/CSS/components → write content.json → launch |
| Runtime hook usage | Generated React components use useContent(), sendResults(), useKeyboard() correctly |
| Content-data separation | Writes content.json separately, browser updates via SSE — not hardcoded in HTML |
| Agent communication channel | POST /results → stdout relay is set up for the agent to read |
| Batch orchestration | State file written and updated between batches (if the skill uses batching) |
| Component quality | Mode-appropriate UI, valid JSX, keyboard-first, top-level App component |

These criteria are more binary (correct/incorrect) than the standard rubric (win/tie/lose). A wrong server command or missing hook is a bug, not a judgment call. Grade as win if correct, lose if incorrect or missing.

**Interactive eval prompts should explicitly request browser mode.** Example:

> "Quiz me on [topic] in the browser — I want timers and click-to-answer."

### Eval agent prompt template

For interactive test cases, use a different prompt template than standard evals. Standard evals say "simulate a conversation." Interactive evals need the agent to show the actual tool calls:

> "Read the skill and all referenced files (especially references/interactive.md and scripts/). Simulate the session but SHOW THE ACTUAL TOOL CALLS — Bash commands, file writes, and generated React code. The components must use the runtime hooks (useContent, sendResults, useKeyboard) and have a top-level App component. Show the full setup sequence, a simulated batch completion via stdout, and the state file update."

The baseline agent gets the same user prompt but is NOT told to show tool calls — it does whatever it naturally would (typically generates a single-file HTML app from scratch).
