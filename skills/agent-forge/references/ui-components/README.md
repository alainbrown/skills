# UI Components

The "components that most agent UIs need" layer — todo display, HITL approval, diff view, citation popovers — packaged for the interface starters that don't ship them.

## Purpose

When the user's stage-3 interface choice lands on `web-ts` or `electron-ts` AND a stage-4 feature implies a specific UI affordance (e.g. they picked `todo-write` as a tool, or they wired up `requires_approval` in their harness), the skill vendors the matching component file from `web/` into the project. Like the `common-tools/ts/` tools, these are MIT, you own them, ~120-200 LOC each.

This layer exists because:
- Both starters render chat, but neither ships approval / todo / diff / citation UIs.
- Building each one ad-hoc per project produces drift (inconsistent UX, repeated bugs).
- Vendoring keeps the code in your repo (audit-friendly, no external dep risk for the components themselves).

## Sibling structure

This directory holds two sibling subdirectories — `web/` for web-ts and electron-ts renderers, `cli/` for cli-ts (Ink-based). Components share prop shapes across the pair; only the rendering differs.

| Subdir | For interface starter | Status |
|--------|----------------------|--------|
| `web/` | `web-ts`, `electron-ts` (renderer) | **Shipped** |
| `cli/` | `cli-ts` (Ink-based components) | **Shipped** |

## Tech-stack assumptions

The `web/` components were authored against:

- **React 19** — `'use client'` directive is present on every file (Next.js requires it; Vite/Electron silently ignore it; this lets one file work for both starters)
- **Tailwind v4** — utility classes only, no v3-style config. Uses `@theme` tokens from the host project where available (`bg-card`, `text-muted-foreground`, `border-border`), falls back to literal colors elsewhere
- **No shadcn imports** — uses plain HTML elements. The web-ts starter has `@/components/ui/*` primitives; electron-ts does NOT (it has no `@/` alias either). To stay copy-paste-compatible with both starters, these components avoid shadcn. If you want fancier buttons in your project, swap in your own
- **Vitest + @testing-library/react + jsdom** — test setup mirrors what both starters already configure

## When the skill includes each component

| Component | Triggered by |
|-----------|-------------|
| `TodoList.tsx` | User picks `todo-write` tool in Stage 4 |
| `ApprovalPanel.tsx` | User picks "require approval for X tools" in Stage 4 (HITL gating), OR picks a harness that exposes approval primitives natively (mastra `requires_approval`, langgraph `interrupt`) |
| `DiffView.tsx` | User picks `file-edit`, `multi-edit`, or any wiki-edit-style tool AND chose ApprovalPanel — the skill wires `renderToolPreview={(r) => <DiffView ... />}` |
| `CitationPopover.tsx` | User describes a research/wiki/RAG agent that emits inline citations |

## Files

```
ui-components/
├── README.md                    (this file)
├── web/                         react-dom + Tailwind siblings (web-ts / electron-ts)
│   ├── TodoList.tsx             agent todos + useTodosFile hook
│   ├── ApprovalPanel.tsx        HITL approve/reject for tool calls
│   ├── DiffView.tsx             unified diff render (wraps react-diff-viewer-continued)
│   ├── CitationPopover.tsx      [N]-marker hover popovers
│   ├── package.json.fragment.md extra deps to install
│   └── tests/                   vitest tests, one per component
└── cli/                         Ink siblings (cli-ts — terminal renderer)
    ├── TodoList.tsx             same prop shape, [ ]/[~]/[x] markers + count header
    ├── ApprovalPanel.tsx        bordered y/n/d keybind panel
    ├── DiffView.tsx             unified diff in terminal colors (red/green/dim)
    ├── CitationPopover.tsx      inline body + numbered footer (also exported as CitationFooter)
    ├── package.json.fragment.md ink / ink-text-input / ink-spinner / diff deps
    ├── README.md                CLI-specific notes
    └── tests/                   ink-testing-library tests, one per component
```

## Per-starter adaptation

Most components drop in unchanged. Two caveats:

### web-ts (Next.js)

- All components Just Work. The `'use client'` directive is required and present.
- `useTodosFile` polls a URL by default. For a real project, replace with an SSE/WS subscription from your `/api` route, or expose `.agent-todos.json` from `/public` and let the default polling continue.

### electron-ts

- All components Just Work in the renderer.
- `useTodosFile` polls — but Electron projects should swap to `window.api.watchFile(path, callback)` (IPC-driven, no polling). Wire your preload script accordingly.
- The "click a local-path citation" branch of `CitationPopover` dispatches a `citation:navigate` CustomEvent on `window`. Wire it to `shell.openPath` via IPC in your renderer.
- ApprovalPanel callbacks (`onApprove`, `onReject`) should call `window.api.approveAgentCall(id)` / `window.api.rejectAgentCall(id)` (or your equivalent IPC).

## Web search / other tools

These are UI components only. For agent tools (bash, file-read, web-fetch, etc.) see `references/common-tools/`. For harness integration (where in the agent loop approval requests come from) see `references/cascade-logic.md` and the harness-snippets directory.

## Testing

```bash
pnpm exec vitest run
```

Each component has a corresponding `tests/<Component>.test.tsx` covering: empty state, happy path, prop callbacks, and one or two edge cases per the schema in `references/tool-test-schema.md` (adapted for UI: a-11y / interaction / rendering).
