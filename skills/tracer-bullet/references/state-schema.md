# `.tracer-bullet-state.json` Schema

Survives context compaction. Single source of truth for the `write_tracer` step.

## Fields

| Field | Type | When set | Notes |
|-------|------|----------|-------|
| `phase` | enum | every step | `"detect" \| "interview" \| "recommend" \| "plan" \| "write" \| "verify" \| "done"` |
| `context.mode` | enum | `detect_context` | `"greenfield"` or `"existing"` |
| `context.cwd` | string | `detect_context` | absolute path |
| `context.language` | string | `detect_context` | e.g. `"typescript"`, `"python"`, `"go"` |
| `context.stackHints` | string[] | `detect_context` | detected libs from manifests (`["express","prisma"]`). Informative only. |
| `io.inputs` | array | `interview` | `[{ name, shape, source }]` — `source` = `"cli-arg"`, `"http-body"`, `"queue"`, etc. |
| `io.outputs` | array | `interview` | `[{ name, shape, destination }]` |
| `io.invocation` | enum | `interview` | `"CLI" \| "HTTP" \| "library" \| "cron" \| "event"` |
| `happyPath` | string | `interview` | one concrete example end-to-end, values not types |
| `constraints` | object | `interview` | `{ sync: bool, perf?, env?, deps? }` — only hard constraints |
| `patterns` | array | `recommend_patterns` | `[{ kind, name, reason, accepted }]`, `kind` ∈ `"pattern" \| "algo" \| "ds"` |
| `tracerPlan` | array | `plan_tracer` | `[{ file, purpose }]`, ≤ 7 entries |
| `verification.mode` | enum | `verify` | `"run" \| "smoke" \| "handoff"` |
| `verification.command` | string | `verify` | only if `mode === "run"` or `"smoke"` |
| `scopeCuts` | string[] | any step | items deferred from the tracer |

## Worked example

```json
{
  "phase": "write",
  "context": {
    "mode": "existing",
    "cwd": "/home/alain/code/notes-api",
    "language": "typescript",
    "stackHints": ["express", "prisma", "sqlite"]
  },
  "io": {
    "inputs": [
      { "name": "note", "shape": "{ title: string, body: string }", "source": "http-body" }
    ],
    "outputs": [
      { "name": "created", "shape": "{ id: string }", "destination": "http-response" }
    ],
    "invocation": "HTTP"
  },
  "happyPath": "POST /notes with {title:'hi', body:'there'} → row in notes table → response {id:'n_123'}",
  "constraints": { "sync": true },
  "patterns": [
    { "kind": "pattern", "name": "Repository", "reason": "one place for DB calls", "accepted": false },
    { "kind": "ds", "name": "ULID", "reason": "sortable ids, single import", "accepted": true }
  ],
  "tracerPlan": [
    { "file": "src/server.ts", "purpose": "express app, POST /notes handler, start on 3000" },
    { "file": "src/db.ts", "purpose": "prisma client, exports db" },
    { "file": "prisma/schema.prisma", "purpose": "Note model with id, title, body" }
  ],
  "verification": { "mode": "run", "command": "npm start & curl -X POST ..." },
  "scopeCuts": [
    "validation of title/body",
    "GET /notes and GET /notes/:id",
    "auth",
    "error responses",
    "Repository pattern abstraction"
  ]
}
```

## Lifecycle rules

- Created at `detect_context` completion.
- Updated at the end of every step — never mid-step.
- Read at the top of every step (after any compaction).
- Deleted at `handoff`.
