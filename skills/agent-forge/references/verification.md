# Verification Checklist

Stage 7 reads this. The bar: one developer running this locally can `git clone`, set env vars,
install, run, and see the agent work — including all wired tools and streaming.

## Step-by-step

### 1. Install

```bash
cd <project.path>
pnpm install
```

- If install fails → STOP. Report the error verbatim and return to `generate` for a fix.
- Common fixes: missing dep in manifest, wrong version range, peer-dep mismatch.

### 2. Env audit

Verify `.env.example` covers every key the produced code references. Programmatically:

```bash
grep -rEho 'process\.env\.[A-Z_]+' src/ vendor/ | sort -u
```

Cross-check the extracted keys against `.env.example`. Any missing → add them.

### 3. Smoke test

The Tools subagent writes `tests/smoke.{test.ts,py}`. Shape:

```typescript
// Example for Claude Agent SDK
test("agent boots and calls at least one tool", async () => {
  const agent = await createAgent({ /* ...same config as src/agent.ts */ });
  const prompt = "<a prompt that should trigger tool use, e.g., 'list the files in this repo'>";

  let toolCallsObserved = 0;
  let outputAccumulated = "";

  for await (const event of agent.stream(prompt)) {
    if (event.type === "tool_use") toolCallsObserved += 1;
    if (event.type === "text") outputAccumulated += event.text;
  }

  expect(toolCallsObserved).toBeGreaterThan(0);
  expect(outputAccumulated.length).toBeGreaterThan(10);
});
```

Run:

```bash
<package-manager> test tests/smoke.{test.ts,py}
```

Outcomes:
- ✓ passes → continue
- ⊘ skipped (e.g., no API key in dev) → flag clearly, don't fail
- ✗ fails → return to `generate` with the failure trace

### 4. Tool tests

Run the exhaustive stateless tests; report integration tools as skip-with-message.

```bash
<package-manager> test tests/tools/
```

Per `tool-test-schema.md`, expected output:

```
Tool tests:
  ✓ file-read         (5/5)
  ✓ file-write        (6/6)
  ⊘ slack-send        (skipped — SLACK_BOT_TOKEN not set)
  ✗ github-pr-create  (4/5, failed: 'rate limit handling')
```

### 5. Streaming sanity check

CLI:
```bash
<package-manager> start
> <type a prompt>
# observe tokens appearing progressively, not all at once
```

Web:
```bash
<package-manager> dev
# open browser, send prompt, observe streaming
```

Electron:
```bash
<package-manager> start
# new window, send prompt, observe streaming + IPC
```

If streaming arrives in one chunk (not progressive) → buffer flushing issue in interface
wiring. Fix in interface code, not in agent core.

### 6. Final report

```
Build summary for <agent.name>
──────────────────────────────────────────────────────────────
  Harness:   <name> (Track <A|B>)
  Interface: <primary> [+ <additional>]
  Tools:     <N MCP servers>, <M bespoke>, <K built-in kept (Track B)>
  Project:   <project.path>

Verification:
  ✓ Install            (deps resolved)
  ✓ Env audit          (.env.example covers all referenced keys)
  ✓ Smoke test         (agent boots, calls tools, returns output)
  ✓ Tool tests         (X/Y stateless passed, Z integration skipped)
  ✓ Streaming check    (token-by-token confirmed in <interface>)

To run:
  cd <project.path>
  cp .env.example .env  # fill in keys: ANTHROPIC_API_KEY, GITHUB_TOKEN, ...
  <package-manager> start

Files of interest:
  src/agent.ts          ← agent core, system prompt, tool registration
  src/prompt.ts         ← system prompt (revise as needed)
  src/interface/*       ← interface code
  tests/                ← run with: <package-manager> test
  FORK_NOTES.md         ← (Track B only) what was vendored, what was stripped
```

## When verification fails

| Failure | Fix path |
|---------|----------|
| Install error | Return to `generate`, fix dep manifest |
| Smoke test fails: API key | Not a code bug — instruct user to set the key |
| Smoke test fails: no tool calls | Agent isn't using tools — check tool registration in agent core |
| Smoke test fails: output empty | Streaming pipeline broken — check interface↔agent integration |
| Tool test fails on stateless tool | Tool wiring is broken — fix in tools/ |
| Streaming arrives in one chunk | Buffer issue in interface — check SSE flushing / stdout flushing |
| TypeScript / type errors | Subagent guessed an API — verify against the harness profile, fix |

If a failure root-causes to an API the subagent guessed (look for `// TODO: verify` comments
or runtime "method does not exist" errors), surface to the user: "I had to guess the API for
X. Here's what I wrote; please confirm or correct."
