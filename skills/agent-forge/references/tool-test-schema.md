# Tool Test Schema

The Tools subagent in Stage 6 generates these. The verify step runs them. Goal: prove every
tool the agent has access to actually works.

## Two categories

### Stateless tools (exhaustive)

Tools whose effects can be observed without external services or fixtures the agent doesn't
own. Test exhaustively — happy path + every failure mode.

| Category | Examples | Run in CI? |
|----------|----------|------------|
| File I/O | read, write, edit, glob, grep | yes |
| Process | bash, shell exec | yes (sandboxed) |
| Text | jq, sed, awk, regex | yes |
| Web read | http GET to public URLs | yes (deterministic fixtures) |

### Integration tools (skip-with-message)

Tools that require external state the agent project doesn't own. Generate the test, but skip
when fixtures missing — print which env var or service is needed.

| Category | Examples | Skip when |
|----------|----------|-----------|
| Messaging | slack-send, discord-post, telegram-send | bot token absent |
| Code hosting | github-pr, gitlab-mr | token absent |
| Databases | postgres-query, sqlite-query | connection string absent |
| Cloud | s3-put, gcs-get | credentials absent |
| Email | gmail-send | OAuth absent |

## Test case schema (language-agnostic)

```jsonc
{
  "tool": "file-read",
  "kind": "stateless",                  // or "integration"
  "cases": [
    {
      "name": "happy path",
      "input": { "path": "<tmpdir>/hello.txt" },
      "setup": "echo 'hi' > <tmpdir>/hello.txt",
      "expect": { "content": "hi" }
    },
    {
      "name": "missing file",
      "input": { "path": "<tmpdir>/missing.txt" },
      "expect_error": "ENOENT|file not found"
    },
    {
      "name": "permission denied",
      "input": { "path": "/root/.ssh/id_rsa" },
      "expect_error": "EACCES|permission denied",
      "skip_if": "uid == 0"
    },
    {
      "name": "oversized output",
      "input": { "path": "<tmpdir>/big.txt" },
      "setup": "head -c 100M /dev/urandom > <tmpdir>/big.txt",
      "expect": { "truncated": true, "size_limit_enforced": true }
    },
    {
      "name": "binary file",
      "input": { "path": "<tmpdir>/bin.dat" },
      "setup": "head -c 1024 /dev/urandom > <tmpdir>/bin.dat",
      "expect": { "handled_as": "binary|error" }
    }
  ]
}
```

For integration tools:

```jsonc
{
  "tool": "slack-send",
  "kind": "integration",
  "skip_if": "!env.SLACK_BOT_TOKEN || !env.SLACK_TEST_CHANNEL",
  "skip_message": "Set SLACK_BOT_TOKEN and SLACK_TEST_CHANNEL to run slack-send tests.",
  "cases": [
    {
      "name": "send simple message",
      "input": { "channel": "$SLACK_TEST_CHANNEL", "text": "test from agent-forge" },
      "expect": { "ok": true, "message_id": "string" }
    },
    {
      "name": "channel not found",
      "input": { "channel": "#nonexistent-test-channel-xyz", "text": "hi" },
      "expect_error": "channel_not_found"
    }
  ]
}
```

## Standard failure modes per tool category

When the Tools subagent generates exhaustive tests for a category, it MUST include:

### File I/O
1. Happy path
2. Missing file
3. Permission denied
4. Oversized input/output (size limit enforcement)
5. Binary file
6. Path traversal attempt (`../../../etc/passwd`) — must be blocked

### Process / shell
1. Happy command
2. Command not found
3. Non-zero exit code
4. Timeout (long-running command)
5. Output exceeds buffer limit
6. Injection attempt (e.g., `; rm -rf /`) — sandbox should isolate

### HTTP read
1. 200 OK with body
2. 404 not found
3. Network timeout
4. Redirect handling
5. Malformed JSON in response
6. Oversized response

## Test runner

| Language | Test runner | Setup pattern |
|----------|-------------|---------------|
| TS | vitest | `pnpm test`, fixtures in `tests/fixtures/` |

As of iter-3, agent-forge is TypeScript-only; vitest is the runner across all starters.

## Reporting

After running tests, report:

```
Tool tests:
  ✓ file-read         (5/5 passed)
  ✓ file-write        (6/6 passed)
  ⊘ slack-send        (skipped — SLACK_BOT_TOKEN not set)
  ✗ github-pr-create  (4/5 passed, 1 failed: 'rate limit handling')

To run skipped: export SLACK_BOT_TOKEN, SLACK_TEST_CHANNEL
To debug failures: pnpm test -- --reporter=verbose
```

The report goes in the project README's "Tested" section after Stage 7.
