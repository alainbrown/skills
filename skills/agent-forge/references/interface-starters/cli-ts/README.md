# agent-cli

Interactive Ink (React-for-the-terminal) CLI starter for an agent. The agent
itself lives in `src/agent.ts` and is replaced by a harness snippet during
skill generation.

## Run

```bash
pnpm install
cp .env.example .env   # fill in keys
pnpm start             # interactive REPL (Ink UI when stdin is a TTY)
pnpm start "one-shot prompt"
```

## Commands

| Script           | What it does                            |
| ---------------- | --------------------------------------- |
| `pnpm start`     | Run the CLI (tsx)                       |
| `pnpm build`     | Compile to `dist/`                      |
| `pnpm test`      | Run vitest                              |
| `pnpm lint`      | ESLint                                  |
| `pnpm typecheck` | tsc --noEmit                            |

## Modes

The entry point (`src/index.tsx`) picks a mode based on its environment:

| Trigger                              | Mode             | UI             |
| ------------------------------------ | ---------------- | -------------- |
| `pnpm start "some prompt"`           | **one-shot**     | raw stdout (pipe-friendly) |
| `echo "ping" \| pnpm start`          | **stdin pipe**   | raw stdout (one-shot per line) |
| `pnpm start` in a TTY                | **interactive**  | Ink (chat UI)  |

One-shot and stdin-pipe modes use the legacy `renderStream` path (line-buffered
output, no cursor games) because Ink's batched-frame model produces ANSI
control sequences that make piped output hard to assert on. This matches how
`gh` and other Ink-using CLIs fork.

## Interactive UI

```
agent-cli — type /exit, Ctrl-C interrupt, Ctrl-D exit

you> summarize this repo
assistant>
  ✓ list_files(".") → 12 files
  ✓ read_file("README.md") → "agent-cli ..."

  # Summary

  A starter for...

┌─ Active tools ──────────────┐    ← visible only while streaming
│ … grep("test", "src/")      │
└─────────────────────────────┘
assistant>
  Looking now...                  ← in-flight stream buffer

agent> type a message              ← input bar pinned to bottom
idle · /help · Ctrl-C interrupt · Ctrl-D exit  ← status line
```

Key points:
- **Completed messages** scroll naturally via Ink's `<Static>` — they render
  once and never re-render, so the terminal scrollback is clean.
- **Active tools** render as a stable pane that updates in place — no
  ever-scrolling tool log polluting the conversation.
- **Streaming buffer** for the in-flight assistant message is plain text;
  markdown is rendered after the turn completes (via the finalized history
  item).

## REPL controls

- `Ctrl-C` — interrupt the current turn (or clear the input if idle). Does NOT exit.
- `Ctrl-D` — exit.
- `/exit` or `/quit` — exit.
- Type and hit Enter to send.

## Layout

```
src/
  index.tsx                # entry: dispatches one-shot / stdin / interactive
  agent.ts                 # PLACEHOLDER — replaced by harness snippet
  App.tsx                  # top-level Ink layout
  components/
    ChatHistory.tsx        # <Static> region for completed messages
    Message.tsx            # one user/assistant message
    ToolInvocation.tsx     # collapsible "tool: name(args) → result" line
    InputBar.tsx           # ink-text-input wrapper, pinned to bottom
    StatusLine.tsx         # model · tokens · cost · streaming indicator
  hooks/
    useAgentStream.ts      # owns history/streaming state, exposes submit/cancel
  lib/
    markdown.tsx           # marked.lexer → Ink Box/Text tree
    stream.ts              # drainStream() consumer (decoupled from React)
  cli/
    render.ts              # legacy raw-stream renderer (one-shot/pipe paths)
  tools/
    mcp-config.ts          # MCP server registry (stub)
    custom/                # bespoke tools live here
tests/
  App.test.tsx             # Ink integration via ink-testing-library
  Message.test.tsx
  ToolInvocation.test.tsx
  cli.test.ts              # spawn-based one-shot + stdin-pipe smoke tests
  tools/registry.test.ts
```

## Why Ink

Compared to the previous readline-based REPL, Ink gives us:

- **Sticky regions**: tool calls render as a pane that updates in place
  instead of as ever-scrolling log lines.
- **Pinned input bar**: the prompt stays at the bottom, history scrolls above.
- **Cleaner cursor management** — no manual ANSI escape twiddling.
- **Shared component vocabulary** with `references/ui-components/cli/`
  (TodoList, ApprovalPanel, DiffView, CitationFooter) so the same Ink tree
  hosts the agent's UX building blocks.
