# Custom Tools

Drop your hand-written, non-MCP tools in this directory. The harness in
`src/agent.ts` should `import` and register them at startup, alongside
the MCP servers declared in `src/lib/tools/mcp-config.ts`.

## Conventions

Each tool is a single file that exports:

- A default object (or named export) with a `name`, `description`, an
  input schema (Zod or JSON Schema), and an `execute(input)` function.
- A type definition for the input/output shape if not obvious from the
  schema.

Example (AI SDK v5 style):

```ts
// src/lib/tools/custom/echo.ts
import { tool } from 'ai';
import { z } from 'zod';

export const echo = tool({
  description: 'Echo a string back to the user.',
  inputSchema: z.object({ message: z.string() }),
  execute: async ({ message }) => ({ echoed: message }),
});
```

Then in `src/agent.ts`:

```ts
import { echo } from './lib/tools/custom/echo.js';
// ...register `echo` with your model/runtime.
```

For tools that need network access, secrets, or long-running work,
prefer to put the logic in a focused module under `src/lib/` and have
the tool file act as a thin adapter — that way the same code can be
called from tests, scripts, or other surfaces.
