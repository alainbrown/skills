# Interface: CLI

The CLI interface is the cheapest, lowest-friction interface for an agent. It's also a great
"sanity check" interface — if the agent works in the CLI, the agent core is sound and
interface bugs are isolated to other interfaces.

## What "CLI" means here

Two flavors:

| Flavor | Description | When to use |
|--------|-------------|-------------|
| **Readline REPL** | Interactive prompt → response loop, streaming tokens to stdout | Default. Most agents. |
| **One-shot** | Single prompt arg → response → exit | Batch / scripting use cases. Pipe-friendly. |

If interactivity is "chat" → REPL. If "batch" → one-shot. Skill picks default based on
`state.capabilities.interactivity`.

## Streaming pattern

Agent emits a stream of events. CLI subscribes and writes to stdout as they arrive. Flush
after every chunk — line-buffered stdout will withhold output until newlines, which makes
streaming look broken.

```typescript
// TypeScript pattern (Claude Agent SDK)
import { query } from "@anthropic-ai/claude-agent-sdk";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
rl.prompt();

rl.on("line", async (input) => {
  for await (const message of query({ prompt: input, options: { /* ...config from state.ux... */ } })) {
    if (message.type === "assistant") {
      process.stdout.write(message.delta);   // flush each delta
    }
  }
  process.stdout.write("\n");
  rl.prompt();
});
```

```python
# Python pattern (OpenAI Agents SDK)
import asyncio
from agents import Agent, Runner

agent = Agent(name="...", instructions=SYSTEM_PROMPT, tools=[...])

async def main():
    while True:
        try:
            line = input("> ")
        except EOFError:
            break
        if not line.strip():
            continue
        async for event in Runner.run_streamed(agent, line):
            if event.type == "raw_response_event" and hasattr(event.data, "delta"):
                print(event.data.delta, end="", flush=True)
        print()

asyncio.run(main())
```

## Key files (TS)

```
src/interface/cli.ts          ← entrypoint; readline loop
package.json                  ← "bin": { "<agent-name>": "./dist/interface/cli.js" }
                                "scripts": { "start": "tsx src/interface/cli.ts" }
```

## Key files (Python)

```
src/interface/cli.py          ← entrypoint
pyproject.toml                ← [project.scripts] <agent-name> = "src.interface.cli:main"
```

## Signal handling

- **SIGINT (Ctrl-C)**: gracefully interrupt the current turn, return to prompt. Don't exit the
  process unless the user is at the prompt with no active turn (then it's clear they want out).
- **SIGTERM**: flush any in-flight output, exit cleanly.
- **EOF (Ctrl-D)**: exit.

## What to avoid

- Don't buffer the entire response before writing — defeats streaming
- Don't print metadata (token counts, latency) inline with content — use a status line or print
  after the response
- Don't ANSI-color the output by default — let the user enable it via flag (some terminals/pipes
  break with ANSI)
- Don't write to stderr for content — stderr is for errors/diagnostics only

## Multi-line input

If users will paste multi-line content, add a "paste mode" toggle (default: each line submits;
toggle: collect until empty line then submit). Most harnesses' built-in CLIs do this — check the
harness profile for whether the wrapped agent loop supports multi-line natively.

## Color and formatting

The CLI should render markdown-like output well:
- Code blocks (triple backtick) → preserve as-is, optionally syntax highlight
- Bold/italic → ANSI if TTY, plain if piped
- Links → print URL inline
- Headers → bolded

Recommended TS libs: `chalk` (color), `marked-terminal` (markdown). Python: `rich`.

## Testing the CLI

Smoke test pattern: pipe a prompt in, capture stdout, assert it contains something reasonable.

```typescript
// vitest example
import { execSync } from "node:child_process";

test("CLI responds to prompt", () => {
  const out = execSync("echo 'list files in this directory' | pnpm start", { encoding: "utf8" });
  expect(out).toMatch(/README|package\.json/);
});
```
