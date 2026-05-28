# Electron mock — contract spec

This document defines what an **electron-interface mock** (Stage 5.5) MUST cover. The mock is
a static HTML+CSS+JS preview that the user iterates on BEFORE Stage 6 generates the real
Electron starter. An approved mock becomes the spec for generation and ships in the produced
project at `mocks/` as a design artifact.

## Form factor

- **Self-contained.** Runs from `mocks/electron/starter/` via `npx serve` (or any static
  server). NO build step. NO `npm install`. NO API keys. NO live IPC.
- **One HTML file + one JS data file.** `index.html` carries the renderer and inline JS;
  `mock-data.js` carries every piece of sample content the user might customize.
- **Tailwind via CDN.** Configure `tailwind.config = { darkMode: 'class' }` BEFORE loading
  `https://cdn.tailwindcss.com`. Dark mode is the default (research/editor tools usually are);
  the `<html>` element MUST carry `class="dark"`.
- **Vanilla JS only.** No React/Vue/Solid. The produced project uses React; the mock does not.

## Desktop chrome (required)

Every electron mock MUST feel like a window, not a web page:

- A fake titlebar at the very top (~28 px tall) carrying:
  - macOS-style traffic-light dots on the left (`● ● ●` red / yellow / green), CSS-only,
    decorative. Note for the skill: a Windows/Linux variant (close/minimize/maximize on the
    right) is equally valid — pick one, both work.
  - The agent name centered, in a small muted font.
- An off-black background (`bg-slate-950` or similar — NOT pure white) so the window reads
  as a native desktop app.
- An optional menu strip is fine but not required for the mock.

## State switcher (required)

A sticky toolbar BELOW the titlebar with five state buttons:

| State            | What the user must see                                                  |
|------------------|-------------------------------------------------------------------------|
| `empty`          | Welcome card with agent name + one-liner + 3-4 clickable suggestion chips |
| `default`        | Full conversation with at least one tool call expanded, one collapsed, one assistant message with markdown + a `[1]` citation marker, CitationPopover open inline next to the marker, TodoList drawer visible in the chat |
| `streaming`      | Last assistant message half-written with a blinking caret, "streaming…" pill near the agent's name, an in-progress tool call (animated dot), composer disabled |
| `approval-pending`| `ApprovalPanel` pinned above the composer with a `file_edit` (or `wiki_edit_page`, etc.) request, summary, DiffView preview (red `-`/green `+` lines in a `<pre>`), Approve/Reject buttons; composer disabled with helper text |
| `error`          | Red error card in the chat ("LLM API timeout — retrying (2/3)…") with a Retry-now button; composer disabled |

The switcher's selection should be visible (highlighted button) and the footer should reflect
the current state.

## Layout switcher (required)

The same toolbar carries a layout switcher with two modes:

| Layout           | Geometry                                                              | When to recommend |
|------------------|-----------------------------------------------------------------------|-------------------|
| `single-pane`    | Chat fills the area below the chrome. No sidebar, no editor.          | Default for plain chat agents; minimal surface area to design. |
| `three-pane`     | CSS grid: left sidebar (~240 px) │ center pane (markdown) │ right pane (chat ~420 px). | Required whenever the user's design includes a sidebar tree / editor / file-watching workflow (the wiki-agent / Obsidian / Cursor shape). |

The mock MUST support BOTH; the user toggles. The state and the layout are orthogonal — every
state must render correctly under either layout.

## Element checklist

Per layout, the rendered DOM must include:

### Always (any layout)

- Titlebar with traffic lights + agent name
- Toolbar with state + layout switchers + active selection indicator
- Agent header strip (brand dot, agent name, model id, nav buttons)
- Chat scroll region with sticky-bottom feel (no need to wire actual sticky behavior in a mock)
- Composer (text input + Send button) — disabled appropriately per state
- Footer note: `Mock — no IPC, no API. State: {state} / Layout: {layout}. Edit \`index.html\` to customize.`

### Three-pane only (conditional)

- **Left sidebar:** root label (e.g., `~/wiki`), a "synced 2s ago" file-watcher badge (when the
  user's design includes file watching — see "External-edit hints" below), a recursive tree
  with at least one expanded folder and one highlighted active file, a footer line with
  file/folder counts.
- **Center pane:** an editor-style read-only preview of the active markdown file (line gutter
  + heading + paragraphs + a code block). Read-only is fine — the mock is not interactive.
- A path/status strip above the editor.

### Default state — sibling UI

- **TodoList:** tucked into a slim right-side drawer of the chat pane (a fourth column inside
  the chat section, NOT a separate top-level grid column). Visible only in `default` state.
  Pending / in-progress / completed icons; completed lines struck through.
- **CitationPopover:** at least one `[1]` marker in the assistant's message with its bubble
  rendered OPEN (positioned absolutely below the marker) so reviewers see the popover shape
  without hovering.

### Approval state — sibling UI

- **ApprovalPanel** banner above the chat scroll region (amber-tinted), carrying the tool
  name + path + summary + a DiffView (red/green pre-block) + Approve/Reject buttons.

## Self-contained requirement

Verify before declaring the mock done:

```bash
cd starter/
npx serve .         # open the printed URL — every state/layout must render
node --check mock-data.js
```

The mock must NOT depend on:

- Any `npm install`
- Real Electron, IPC, or `window.api`
- A backend server or API keys
- Filesystem reads at runtime (sample content is baked into `mock-data.js`)

## How the skill customizes

When this mock starter is copied into the user's project for Stage 5.5 iteration, the skill
edits `mock-data.js` and a few labels in `index.html`:

- `MOCK.agent.{name, description, persona}` — the user's agent identity, persona vibes.
- `MOCK.empty.suggestions` — 3-4 prompts that match the user's stated use case.
- `MOCK.default.messages` — a representative exchange in the user's chosen scenario.
- `MOCK.sidebar.files` — a plausible tree if the user has a wiki / notes / data dir.
  Skip if `layout=single-pane`.
- `MOCK.editor.activeFile.{path, content}` — the content shown in the center pane in
  three-pane mode.
- `MOCK.approval.pendingApproval` — only if the user's tool set includes any HITL-gated
  tool. Set `toolName` and `args` to match the user's tool shape.
- `MOCK.todos` — populated only if the user picked `todo-write`.
- `MOCK.error.lastError` — flavor the message to match the user's stated error policy
  (fail-fast vs retry-with-backoff).

The skill should NEVER ship a "you are a helpful AI assistant"-shaped mock — every label,
suggestion, and message in the mock must reflect the user's `state.context` (intent,
audience, style).

## External-edit hints (conditional)

If the user's design includes file watching (chokidar / `fs.watch` / the wiki-agent pattern),
the three-pane sidebar should carry a small badge like `synced 2s ago` near the root label.
This makes the file-watcher feature visible in the mock so the user sees and signs off on it.
For designs WITHOUT file watching, drop the badge.

## Out of scope (do NOT include)

- Real IPC simulation or `window.api` shims.
- Actual file reads/writes from the renderer.
- A Settings dialog. (The Settings page exists in the real starter but does not need a mock
  — it's stock and the user rarely customizes it.)
- Auto-update / code signing / packaging affordances.
- Multi-window or popout chrome.
- Live model invocation, streaming over real HTTP/SSE/WS, or any network call.

## Iteration discipline (for the skill)

The user reviews the mock, requests changes ("more compact left pane", "change the persona",
"swap the suggested prompts", "remove the approval banner — I don't want HITL"). The skill
applies the edits to `mock-data.js` and/or `index.html` and reloads. Once approved, the
skill records the approved mock content into `state.ux.mockApproved = true` and the
approved layout + persona become the spec for Stage 6 generation. The approved `mocks/`
directory ships with the produced project.
