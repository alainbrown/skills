# Common tools — deps to add to your project

These tools are vendored — you own them. They use the AI SDK `tool()` shape, which
works directly with:

- **mastra** (via `@mastra/core/agent` — pass the tools object verbatim)
- **openai-agents-sdk-ts** (consumes AI SDK tools)
- **langgraph-ts** (consumes AI SDK tools)

For other frameworks, import the `*Impl` named export and rewrap with that framework's
tool helper.

## Runtime deps

```bash
pnpm add ai zod turndown glob
```

| Dep         | Version | Used by                            |
| ----------- | ------- | ---------------------------------- |
| `ai`        | ^5.0.0  | all (AI SDK `tool()` helper)       |
| `zod`       | ^3.23.0 | all (input schemas)                |
| `turndown`  | ^7.2.0  | web-fetch (HTML → markdown)        |
| `glob`      | ^11.0.0 | glob, grep (file walking)          |

> Note: AI SDK v5 renamed `parameters` → `inputSchema`. Pin `ai@^5` to match these tool definitions.

## Dev deps

```bash
pnpm add -D @types/turndown @types/node vitest typescript
```

## Node version

These tools target **Node 20+**. We use the npm `glob` package rather than
`fs.glob` (Node 22+) so the same code runs on the cli-ts starter's Node 20
baseline.

## Files

```
common-tools/ts/
├── bash.ts          - shell exec (REAL shell, REAL injection risk — see header)
├── file-read.ts     - read with line numbers, 10 MB cap, binary detection
├── file-write.ts    - atomic write (.tmp + rename), creates parent dirs
├── file-edit.ts     - find/replace, errors on missing or non-unique oldString
├── glob.ts          - file pattern matching, sorted by mtime desc
├── grep.ts          - regex search across files, skips binaries
├── web-fetch.ts     - http/https → markdown, localhost blocked by default
├── tsconfig.json    - strict config the tools were verified under
└── tests/           - vitest tests, one per tool
```

## Caller options (NOT model-exposed)

Some tools accept a second `opts` argument on the underlying `*Impl` function that is
intentionally not surfaced to the model:

- `fileReadImpl(args, { allow_outside_cwd?, cwd? })`
- `fileWriteImpl(args, { allow_outside_cwd?, cwd? })`
- `fileEditImpl(args, { allow_outside_cwd?, cwd? })`
- `webFetchImpl(args, { allow_localhost? })`

These guard rails (path traversal, SSRF) are off by default to the model. If you need
to toggle them per-call from trusted code, call the `*Impl` directly. Do **not** move
these flags onto the zod schema — the model could then disable its own sandbox.

## Testing

```bash
pnpm exec vitest run
```

Each tool has a corresponding `tests/<tool>.test.ts` covering the happy path plus the
failure modes listed in `references/tool-test-schema.md` (6 per File I/O tool, 6 for
process/shell, 6 for HTTP read).
