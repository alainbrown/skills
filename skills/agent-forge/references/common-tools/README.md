# Common Tools

The "tools that most agents need" layer — bash, file ops, glob, grep, web fetch — packaged for harnesses that don't ship them.

## When you need this

Per the harness profiles, only some shortlisted harnesses ship a general-purpose tool layer:

| Harness | Ships bash/file/web tools? | Common-tools needed? |
|---------|---------------------------|---------------------|
| `openai-agents-sdk` | ✗ harness-only | **Yes** |
| `langgraph` | ✗ harness-only (`@langchain/community/tools` is opt-in + heavy) | **Yes** |
| `mastra` | ✗ harness-only (`createTool` primitive, no toolkit) | **Yes** |
| `opencode` (Track B) | ✓ 18 built-in tools | No |

## Two paths to choose from

**Bespoke individual (vendored, you own them):**
The skill drops named tool files into your project's `src/tools/custom/` (or `src/lib/tools/custom/` for web projects). Each is ~80 LOC, MIT, no hidden complexity. You pick which tools to include — bash, file_read, web_fetch, etc. — via a checklist in Stage 4. After they're in your repo, you maintain them as part of your codebase.

- **Pros:** small surface, audit-friendly, no external dep risk, real-shell access (works with pipes/redirects)
- **Cons:** you own upgrades; weaker isolation than just-bash (real shell vs. simulated)

**Framework (external dep, less code in your repo):**
- `vercel-labs/just-bash` (MIT, Vercel-maintained) — simulated in-memory bash with virtual filesystem, allow-listed network access, ~thousands of LOC you never see in your repo. The TS harnesses (mastra, openai-agents-sdk-ts, langgraph-ts) consume it as AI SDK tools via `bash-tool`.
- **Pros:** strong isolation (no real shell process), Vercel maintains, large surface (100+ commands implemented in-TS)
- **Cons:** opinionated environment (virtual FS), upgrade churn lives outside your repo

## What's included (bespoke layer)

`ts/` ships 9 tools:

| Tool | What it does | Failure modes tested |
|------|--------------|----------------------|
| `bash` | Execute shell command (subprocess with timeout + size limit) | happy / command not found / nonzero exit / timeout / oversized output / shell injection |
| `file-read` | Read file with line numbering and offset/limit | happy / missing / permission denied / oversized / binary / path traversal blocked |
| `file-write` | Atomic write with parent-dir creation | happy / permission denied / oversized / path traversal blocked |
| `file-edit` | Find/replace edit within a file | happy / not found / non-unique / no-op (old===new) / path traversal blocked |
| `multi-edit` | Apply a sequence of find/replace edits atomically to one file (all-or-nothing, sequential) | happy (3 sequential) / sequential semantics / replaceAll mix / edit-N-not-found reverts / non-unique reverts / old===new reverts / path traversal blocked / file unchanged on error / trailing newline preserved / ENOENT no tmp leftover / empty edits array |
| `glob` | Find files matching a pattern | happy / no matches / cap enforced / mtime-sorted |
| `grep` | Search files for a regex pattern | happy / no matches / oversized files skipped / binary files skipped / invalid regex |
| `web-fetch` | Fetch URL, convert HTML to markdown | happy / 404 / timeout / oversized / redirect / localhost rejected by default |
| `todo-write` | Persist the agent's current todo list to `.agent-todos.json` (replace-whole-list, atomic write) | happy 3 items / empty list / by_status counts / no .tmp leftover / second write replaces first / custom path / invalid status rejected / empty text rejected |

**Not included:** `web_search`. See `web-search.md` for why and provider-specific snippets.

**Note on `todo-write`:** the tool is the agent's *interface*; the JSON file is the *storage*; a UI component is the *presenter*. See `references/ui-components/{web,cli}/TodoList` for components that watch `.agent-todos.json` and render it visibly to the user. Without a UI wired in, the tool still works (the file is updated) — you just won't see the list as it changes.

## Per-harness adaptation

The shipped shape is AI SDK `tool()` for TS, which works directly with mastra, openai-agents-sdk-ts, and langgraph-ts.

- **Mastra:** AI SDK `tool()` shape works directly — Mastra's `createTool` consumes AI SDK tools, or you can `import { bash } from "./tools/bash"` and add to your agent's `tools` object.
- **openai-agents-sdk (TS):** consumes AI SDK `tool()` via `@openai/agents` directly. Drop in and add to the Agent's `tools` array.
- **langgraph-ts:** wrap with `@langchain/core/tools` `tool()` if you want LangChain's tool object, or use the underlying `*Impl` function and register via `bindTools`.
- **opencode (Track B):** ships its own toolkit. If you need a specific tool not in the harness, copy the bespoke version and adapt it to the harness's tool registration mechanism (see the opencode profile for the registration pattern).

## Stage 4 in the cascade

When the skill enters Stage 4 (tools) and the chosen harness needs a common-tools layer, it asks:

```
Tool kit approach?

  [a] Bespoke individual tools (you pick which, ~80 LOC each, you maintain)
      bash file-read file-write file-edit multi-edit glob grep web-fetch todo-write

  [b] Framework: vercel-labs/just-bash + bash-tool
      Strong isolation, large surface, Vercel-maintained.

  [c] Mix: framework for the big surface, plus 1-2 bespoke tools.

Pick or choose tools individually?
```

In bespoke mode, the skill lists each tool with a one-line description and the user checks which to include. Each checked tool is dropped into the project's `tools/custom/` with its test file. The skill also wires its registration into the agent's tool list.

## Web search

Not in the bespoke kit because every reliable option needs an API key. See `web-search.md` for snippets per provider (Brave / Exa / Tavily). The skill offers web-search as a separate Stage 4 question with provider selection.

## Python

Earlier iterations shipped a Python equivalent (`common-tools/py/`). As of iter-3, agent-forge is TypeScript-only and the Python layer was removed. Users who need Python tools should pick a different skill or use `@langchain/community/tools` / Agno / smolagents.
