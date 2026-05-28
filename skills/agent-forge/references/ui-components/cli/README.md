# ui-components/cli

Ink-based (React for the terminal) sibling components to the web variants in
`references/ui-components/web/`. They share **prop shapes** with the web
components — `TodoItem`, `ApprovalRequest`, `Citation`, etc. — but render to
the terminal using Ink primitives (`<Box>`, `<Text>`, `useInput`) instead of
HTML + Tailwind.

The pattern they encode (status visualization, approval flow, unified-diff
coloring, citation cross-referencing) is the shared substrate; the rendering
is interface-specific.

## When the skill includes each

The `agent-forge` skill vendors a component into a generated project when both
of the following are true:

1. The project chose the **cli-ts** interface starter.
2. A state signal indicates the component is needed:

| Component             | Included when…                                                          |
| --------------------- | ----------------------------------------------------------------------- |
| `TodoList`            | The agent uses the `todo-write` common tool. Watches `.agent-todos.json`. |
| `ApprovalPanel`       | The harness has any HITL approval policy (`state.hitl.mode !== 'auto'`). |
| `DiffView`            | The agent has tools that mutate files (file edit, wiki write, code patch). Used inside `ApprovalPanel.renderToolPreview` to preview file changes. |
| `CitationPopover` / `CitationFooter` | The agent emits citations (web search, RAG, wiki retrieval). |

If a project uses the **web** interface, the skill vendors the sibling from
`references/ui-components/web/` instead. If a project uses **both** interfaces
(e.g., an Electron shell with both CLI and BrowserWindow), the skill vendors
both.

## Files

```
cli/
├── TodoList.tsx           ← sticky-header todo list with status markers
├── ApprovalPanel.tsx      ← bordered y/n/d approval prompt with optional preview slot
├── DiffView.tsx           ← unified diff coloring (red/green/dim)
├── CitationPopover.tsx    ← inline body + numbered citations footer (exported as both names)
├── tests/
│   ├── TodoList.test.tsx
│   ├── ApprovalPanel.test.tsx
│   ├── DiffView.test.tsx
│   └── CitationPopover.test.tsx
├── README.md              ← this file
└── package.json.fragment.md  ← deps to merge into the host project's package.json
```

## CitationPopover note

In the terminal there is no hover state, so the "popover" metaphor doesn't
apply. The CLI component renders the children inline (with `[N]` markers
already present) and appends a numbered footer listing the citations. The
component is exported under **two names** for clarity:

- `CitationPopover` — keeps prop-shape symmetry with the web import path.
- `CitationFooter` — the more accurate CLI name. Use this in new code.

Both names point to the same implementation.

## Relationship to the web siblings

| Concern              | web/                        | cli/                                       |
| -------------------- | --------------------------- | ------------------------------------------ |
| Renderer             | React DOM + Tailwind        | Ink (`<Box>`, `<Text>`)                    |
| Input                | mouse + keyboard            | keyboard only (`useInput`)                 |
| State persistence    | watcher hook (chokidar/SWR) | watcher hook (`fs.watch`)                  |
| Cross-process events | postMessage / SSE / IPC     | same — wire up at the host                 |
| Layout primitives    | flexbox + Tailwind          | flexbox via Ink (yoga)                     |

The data they consume is interface-agnostic — the same JSON file (e.g.,
`.agent-todos.json`) backs both, and the same `ApprovalRequest` shape flows
through both. **The web and CLI components should never be swapped at runtime
inside the same renderer**; the skill picks one per interface starter.

## Testing

Component tests use `ink-testing-library`. Each test calls `render(<Component />)`
and asserts on `lastFrame()` (the last frame of terminal output) or simulates
keypresses by writing to `stdin`.

```bash
# In a host project that has vendored these components, after installing the
# deps from package.json.fragment.md:
pnpm test
```

## License

MIT. The vendored copy in a generated project is owned by the project. The
project owner is free to modify, fork, or delete as needed.
