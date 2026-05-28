# Web Interface Mock — Schema

Contract for the `web` interface mock produced in Stage 5.5 (`mock-iterate`).
This file specifies what the mock MUST cover so the user can review the look
and feel of their agent BEFORE the project is generated.

## Purpose

The mock is a single static HTML page (`starter/index.html`) that previews
the five visible states of the `web-ts` interface starter using the user's
agent name, persona, tool list, and conversation style. The user opens it
in a browser, walks through the states, and tells the skill what to change.
Approved mocks ship in the produced project at `mocks/` as a design artifact.

## How it runs

```
cd mocks/
npx serve .
# open http://localhost:3000 in a browser
```

- **No build step.** Plain HTML + CSS + vanilla JS.
- **No install.** Tailwind via CDN script tag.
- **No API keys.** Everything is static mock content.
- **No backend.** All state is local to the page.

If the user already has `python3`, `python3 -m http.server` works too.

## Required states

The mock MUST include all five states. The state-switcher bar at the top of
the page lets the user click between them without simulating real events.

| State | What it shows |
|-------|---------------|
| `empty` | Welcome screen — agent name, one-liner description, 3-4 suggested-prompt cards |
| `default` | A full conversation: user turn, agent turn with markdown + tool calls (one expanded, one collapsed), copy button |
| `streaming` | Same layout, last agent message half-written, blinking caret, in-progress tool call, "streaming..." pill, composer disabled |
| `approval` | Default conversation + pinned `ApprovalPanel` above composer with a `file_edit` request and red/green diff; composer disabled with "Resolve approval to continue." |
| `error` | Default conversation + a red error card from the agent ("LLM API rate-limited (429). Retrying in 8s...") + "Retry now" button; composer disabled |

### Conditional states

| State | Required when |
|-------|---------------|
| `approval` | At least one tool in `state.tools` is marked HITL (Mastra `requireApproval`, langgraph `interrupt`, etc.) |
| `streaming` | `state.ux.streaming !== 'none'` (default `token-by-token`) |
| `default`, `empty`, `error` | Always required |

When a state is not required, its switcher button MUST be rendered visibly
disabled (greyed + `cursor-not-allowed` + tooltip "Disabled — no HITL tools").
Do NOT remove the button. The user still sees the slot and learns which
states their design implies.

## Required elements

| Element | Lives in | Notes |
|---------|----------|-------|
| Header strip | top of page | Agent name + tagline + status indicator (small colored dot + label) |
| State switcher | sticky bar below header | Five buttons; active = solid bg; disabled = greyed |
| Theme toggle | inside state switcher | "Light / Dark" — toggles `.dark` on `<html>` |
| Chat area | center column | Scrollable, max-width container, `prose-chat` typography |
| Message bubbles | inside chat area | User: right-aligned, `rounded-2xl rounded-tr-sm bg-primary`. Assistant: left-aligned, `rounded-2xl rounded-tl-sm border bg-card` |
| Tool-call card | inline with assistant message | `rounded-lg border bg-muted/30`, chevron + wrench, status pill (`running`/`done`/`error`) — one expanded, one collapsed |
| Composer | bottom of page | Textarea + send button; disabled state covered |
| Footer note | bottom of page | "Mock — no API calls. State: {currentState}. Edit `index.html` to customize." |

### Conditional elements

| Element | Required when |
|---------|--------------|
| `TodoList` (right sidebar in default state) | `state.tools` includes `todo-write` |
| `ApprovalPanel` (above composer in approval state) | Any HITL tool present (same condition as approval state) |
| `DiffView` (inside ApprovalPanel) | HITL tool is edit-style (`file-edit`, `multi-edit`, wiki-edit-style) |
| `CitationPopover` (pinned-open in default state, with "(hover preview)" hint) | `state.tools` implies research/wiki citations |

If not required, simply do not render. Do NOT show empty stub regions.

### Layout fidelity: mock affordance vs production commitment

The mock widens to `max-w-5xl` with a 2-column grid so the `TodoList` (when shown) fits side-by-side with the chat. The actual produced project (`interface-starters/web-ts/src/page.tsx`) uses `max-w-3xl` single-column and renders `TodoList` ABOVE the chat instead. The mock's sidebar placement is a **review affordance** — it lets the user verify the TodoList's visual style — NOT a commitment that Stage 6 will produce a sidebar layout.

If a user asks during iteration "I want the sidebar in production too," that's a real layout request and Stage 6 should honor it (change `max-w-3xl` → `max-w-5xl` in `page.tsx`, move TodoList from above the chat into a sibling column). Surface that explicitly when the user requests it; don't silently promise it just because the mock shows it.

## State-switcher contract

- Sticky bar directly below the header.
- 5 buttons in order: Default, Empty, Streaming, Approval, Error.
- Active state: solid background, `aria-pressed="true"`.
- Click → toggle `data-state` on the chat root container; CSS selectors hide
  everything except `[data-state="X"] .state-X { display: block }`.
- Pure JS, no page reload. Updates the footer note's `{currentState}` value.
- The theme toggle is a sibling button on the right side of the switcher.

## Self-contained requirement

- Tailwind via `<script src="https://cdn.tailwindcss.com"></script>`.
- BEFORE the CDN script, set `tailwind.config = { darkMode: 'class' }` so the
  theme toggle works with `<html class="dark">` (class strategy, not media).
- Inline the `:root` / `.dark` CSS variable blocks from the starter's
  `globals.css` verbatim (oklch values + radius + font stacks) plus the
  `.prose-chat` rules. This keeps the mock visually identical to what the
  produced project will render.
- No React, no Vue, no bundler. Vanilla JS templating with `innerHTML` and
  template literals. One `init()` function on `DOMContentLoaded`.
- No external API calls. No fonts loaded from Google. No analytics.

## What the skill customizes

When the skill generates this mock for a specific user, it edits ONLY
`starter/mock-data.js` and (rarely) inline strings in `index.html`. The user
refreshes the browser to see changes.

| From state | Edit in mock-data.js |
|------------|---------------------|
| `state.agent.name` | `MOCK.agent.name` |
| `state.agent.description` | `MOCK.agent.description` |
| `state.context.style` + `audience` | `MOCK.agent.persona` (drives tone of mock messages) |
| `state.tools.mcpServers[].name` | Used in tool-call card names |
| `state.tools` list | Suggested prompts; tool calls shown |
| HITL flags | Whether approval state's button is enabled |
| Citations flag | Whether CitationPopover is rendered in default state |

The skill rewrites the conversation in `MOCK.default.messages` to fit the
agent's actual purpose (a coding agent gets a coding question; a research
agent gets a research one). Mock messages MUST be concrete, not Lorem ipsum.

## Editing the mock during the iteration loop

- The skill edits `starter/mock-data.js` and (for layout tweaks) the section
  templates in `starter/index.html`.
- The user refreshes the browser tab (`npx serve` does not auto-reload —
  this is intentional, no dev server overhead).
- The user gives feedback in natural language. The skill makes the next pass.
- When the user approves, the mock files are copied into the produced
  project at `mocks/web/`.

## Injection markers

The skill scans `index.html` and `mock-data.js` for `<!-- mock content — skill replaces ... -->`
and `// mock content — skill replaces ...` comments. These mark the exact
fields the skill is allowed to overwrite. Anything else (layout, classes,
state-switcher logic) is structural and the skill should not touch without
the user asking.

## Out of scope

The mock does NOT preview:
- Auth flows (sign-in, sign-up, OAuth) — single-user starter
- Settings UI (model selector, system prompt editor) — real project may add this
- Provider selection / API key inputs — `.env`-driven
- Multi-conversation list / history sidebar — real project may add this
- Mobile responsiveness deep-cuts — mock is desktop-first, baseline mobile only
- Real streaming animation timing (just shows the static "in-progress" frame)
- Keyboard shortcuts beyond Enter-to-send

These either live in the real project or are project-specific concerns the
skill addresses in Stage 6, not 5.5.

## Verification before showing the user

1. `index.html` is well-formed (parseable).
2. All five state-switcher buttons render.
3. Footer note updates when state changes.
4. Theme toggle flips `<html class="dark">`.
5. Mock data is concrete, agent-name-derived — not placeholder.
