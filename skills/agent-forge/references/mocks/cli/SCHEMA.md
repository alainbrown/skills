# CLI Interface Mock — Schema

Contract for the `cli` interface mock produced in Stage 5.5 (`mock-iterate`).
This file specifies what the mock MUST cover so the user can review the look
and feel of their agent BEFORE the project is generated.

## Purpose

The mock is a single markdown file (`starter/transcripts.md`) with named
example transcripts that preview every visible state of the `cli-ts` Ink REPL
using the user's agent name, persona, tool list, and conversation style. The
user opens it in their editor (or in a rendered-markdown viewer), reads the
scenarios, and tells the skill what to change. Approved mocks ship in the
produced project at `mocks/transcripts.md` as a design artifact and as the
seed for future test scenarios.

## How it runs

There is nothing to run — the mock is plain markdown. Two viewing options:

```
# Option A — open in your editor (recommended)
$EDITOR mocks/cli/starter/transcripts.md

# Option B — render markdown in a browser
cd mocks/cli/starter && npx serve .
# then open http://localhost:3000/transcripts.md in a viewer that renders MD
```

- **No build step.** Pure markdown with fenced terminal blocks.
- **No install.** No deps.
- **No API keys.** Everything is mock content.
- **Monochrome.** ANSI color in the real Ink UI does not render in markdown —
  the transcripts use box-drawing characters and inline annotations instead.

## Required scenarios

The mock MUST include every required scenario below as a `## Scenario: <Name>`
section. Each scenario is a 2-3 line italic description followed by ONE
fenced terminal block (` ```text `) showing the interaction.

| Scenario | What it shows |
|----------|---------------|
| `Welcome / empty session` | First-run banner, agent name, suggested prompts, "type to start" hint, idle status line |
| `Default conversation` | One full turn: user asks, agent thinks, calls a tool, returns a final markdown answer |
| `Streaming behavior` | The same default turn annotated to show progressive token arrival, in-flight Active tools pane, blinking caret |
| `Approval pause` | Agent proposes a destructive tool call; ApprovalPanel renders inline; user enters `y`; agent continues |
| `Error handling` | Tool failure or LLM API failure; recovery behavior matches the user's UX policy (fail-fast OR retry-with-backoff) |

### Conditional scenarios

| Scenario | Required when |
|----------|--------------|
| `Approval pause` | At least one tool in `state.tools` is marked HITL (Mastra `requireApproval`, langgraph `interrupt`, etc.) |
| `Multi-turn / persistence` | `state.ux.persistence !== 'none'` — shows a second `pnpm dev` invocation where the agent resumes prior context |
| `Streaming behavior` | `state.ux.streaming !== 'none'` (default `token-by-token`) |
| `Welcome / empty session`, `Default conversation`, `Error handling` | Always required |

When a scenario is NOT required for the user's design, OMIT it entirely.
Unlike the web mock (which greys out disabled buttons), markdown has no
spatial "slot" concept — leaving an unused section in would just confuse the
review. Note in the top-of-file comment which scenarios were skipped and why.

## Transcript format conventions

Match the Ink-based `cli-ts` starter and `ui-components/cli/*.tsx` rendering
as closely as plain text allows. Specifics:

### Prompt prefixes

- **`you> `** — completed user turns (matches `Message.tsx` history rendering).
- **`agent> `** — the LIVE composer at the bottom of the screen (matches
  `InputBar.tsx`). Use in welcome scenario and inside streaming scenarios
  when showing the in-flight UI.
- **`assistant>`** — agent's output label (matches `Message.tsx`). Body is
  indented two spaces below the label.

### Box-drawing — match the actual Ink component's border style

The starter uses two different border styles. Mirror them in the transcripts:

- **Single corners (`┌ ─ ┐ │ └ ┘`)** for the `Active tools` pane (matches
  `App.tsx` — `borderStyle="single"`). Used during streaming.
- **Rounded corners (`╭ ─ ╮ │ ╰ ╯`)** for `ApprovalPanel` and `TodoList`
  (matches their `borderStyle="round"` in `ui-components/cli/`).
- Use ASCII-art only inside fenced blocks. Outside fenced blocks, use prose.

### Tool calls — single-line inside one pane, not one box per tool

The Ink UI renders each tool invocation as a SINGLE LINE inside the shared
Active tools panel. Do not box each tool individually. Format per
`ToolInvocation.tsx`:

```
… file_read(path="src/server.ts")
✓ file_read(path="src/server.ts") → "import express from 'express'…"
✗ bash(cmd="rm -rf /") → permission denied
```

Status markers: `…` running (yellow), `✓` ok (green), `✗` error (red). Color
is lost in markdown — the marker alone communicates state.

### Streaming cues

- Use a trailing `▌` caret on the partial assistant line to signal "still
  arriving." Place it where the cursor would be.
- Add a short inline annotation `# (tokens stream in over ~2s)` ABOVE the
  fenced block (not inside) so it's clear what the reader is meant to imagine.
- Show the Active tools pane updating in two snapshots if useful — first
  with `…` running, then with `✓` complete.

### Status line

Matches `StatusLine.tsx`:

```
⠋ streaming  ·  claude-sonnet-4-5  ·  142 in / 38 out
idle · /help · Ctrl-C interrupt · Ctrl-D exit
```

Spinner is `⠋` (dots, per `ink-spinner`). Separator is the middle-dot `·`.

### Approval prompts

Mirror `ApprovalPanel.tsx` keys exactly: `[y] approve   [n] reject   [d] details`.

> Note for skill authors: the task draft showed `[1] Approve [2] Reject [3]
> Show diff`. The actual Ink component uses `y/n/d`. We mirror the component.

A `DiffView` block inside the panel uses `+` (additions) and `-` (deletions)
with a `@@ ... @@` hunk header per `DiffView.tsx`. Color is again lost in
markdown but the leading character is enough.

### TodoList (conditional — only when `todo-write` is in state.tools)

Render with the round border and the marker scheme from `TodoList.tsx`:
`[ ]` pending, `[~]` in_progress, `[x]` completed.

### Citations (conditional — only when state implies citations)

Use the `CitationFooter` shape from `CitationPopover.tsx`: body text with
inline `[N]` markers, then a `Citations` footer below a `────────────────`
divider.

## Persona, tools, domain alignment

The mock content MUST reflect the user's actual decisions, not generic
filler:

| From state | Drives |
|------------|--------|
| `state.agent.name` | The banner, the suggested-prompt hint, the running `bin` name in any example commands |
| `state.agent.description` | Tagline under the banner in the welcome scenario |
| `state.context.style` + `audience` | Tone and verbosity of every agent line in the transcripts |
| `state.context.intent` (domain) | Subject of every scenario — coding agent gets coding questions, research agent gets research questions, support agent gets support questions |
| `state.tools` list | Tool names rendered in invocation lines. ONLY tool names that actually exist in the user's selection. |
| `state.tools.mcpServers` | MCP-backed tool calls labelled with their MCP server prefix if the harness uses one |
| HITL flags | Whether the `Approval pause` scenario is included at all |
| `state.ux.errorPolicy` | Whether `Error handling` shows fail-fast (red error + exit-to-prompt) or retry-with-backoff (`Retrying… attempt 2/3`) |
| `state.ux.persistence` | Whether `Multi-turn / persistence` is included |
| `state.ux.streaming` | Whether `Streaming behavior` is included; for `message-level`, drop the per-token caret and show whole-message arrivals |

## What the skill customizes

When the skill generates this mock for a specific user, it edits the single
file `starter/transcripts.md` in place. Concrete edits:

1. Replace every `{{AGENT_NAME}}` token with `state.agent.name`.
2. Replace every `{{AGENT_DESC}}` token with `state.agent.description`.
3. Replace every `{{DOMAIN_PHRASE}}` token with a one-line description of
   the agent's purpose (used in the welcome banner subtitle).
4. Rewrite the bodies of every scenario to fit the agent's actual domain
   and tools. Do NOT keep the `node-debugger` example content if the user's
   agent is a research bot — the whole transcript narrative changes.
5. Remove scenarios that are conditional and not required.
6. Update the top-of-file comment to list which scenarios are present and
   which were skipped.

The starter ships with a coding-agent example (`node-debugger` — debugs
Node.js issues in the user's repo, tools: bash, file_read, file_edit, grep).
This is concrete content the user reads and reacts to; the skill rewrites it.

## Placeholder syntax

Use `{{NAME}}` (double curly braces) for substitution markers — NOT HTML
comments. HTML comments inside fenced code blocks render literally in many
markdown viewers, which is ugly. Examples used by the starter:
`{{AGENT_NAME}}`, `{{AGENT_DESC}}`, `{{DOMAIN_PHRASE}}`. The skill scans
for `{{` to find and replace these.

## Editing the mock during the iteration loop

- The skill edits `starter/transcripts.md` directly (one file).
- The user re-opens (or re-renders) the file in their viewer.
- The user gives feedback in chat — "make the approval prompt more terse",
  "add a scenario for a multi-step refactor", "the agent's tone should be
  drier, fewer exclamations".
- The skill makes the next pass on the markdown.
- When the user approves, the file is copied into the produced project at
  `mocks/transcripts.md`. Future Stage-6 test cases can derive expected
  agent behavior from these transcripts.

## Out of scope

The mock does NOT preview:
- Real ANSI color rendering — markdown is monochrome
- Shell completion behavior / readline keybindings beyond Ctrl-C/Ctrl-D
- Terminal resize behavior, scroll-back, line-wrapping in narrow terminals
- One-shot mode (`pnpm dev "prompt"` → stdout → exit) — the mock only covers
  interactive REPL; one-shot is just the raw stream renderer with no UI
- Real streaming animation timing (only static "in-progress" snapshots)
- Markdown-rendered final agent output (the post-stream `marked-terminal`
  pass) — transcripts show the streamed raw text only
- Token/cost accuracy (numbers in status lines are illustrative)

These either live in the real project or are concerns Stage 6 handles, not 5.5.

## Verification before showing the user

1. The file parses as valid markdown (every fenced block has a closing fence).
2. Every required scenario is present; every excluded scenario is conditional
   and was correctly skipped per `state`.
3. Box-drawing characters render as a clean grid in a monospace font — no
   alignment drift, no width mismatches between top/bottom borders.
4. Tool names in invocation lines match `state.tools` exactly — no
   hallucinated tool names.
5. No `{{PLACEHOLDER}}` tokens remain after substitution.
6. Agent voice in every scenario is consistent with `state.context.style`.
