# Tool Templates

This file defines tool **shapes** — what each tool does, its schema, and security requirements. Subagents adapt these into working implementations using current library docs.

**Do not copy code verbatim.** Verify current APIs via documentation tools if available. If not, use training knowledge but flag fragile patterns (see below).

### Known fragile patterns

These patterns change between AI SDK versions. Verify before using:

- **`tool()` config keys** — `inputSchema` vs `parameters`, `output` vs `result`. Check which is current.
- **`createMCPClient`** — was `experimental_createMCPClient` in earlier versions. Verify import name.
- **MCP transport config** — the shape of `transport` objects (type, command, args) may change.
- **Agent class name** — has been renamed across versions. Verify the current concrete class name (not just the interface).
- **Agent constructor** — `instructions` vs `system`, `stopWhen` vs `maxSteps`. Verify current keys.
- **Zod API** — generally stable, but verify `.describe()` is still the way to annotate fields.

If documentation tools are unavailable, flag these with `// TODO: verify` comments so the user can check.

## Native Tool Pattern

Every native tool follows this shape:

```
import { tool } from "ai"
import { z } from "zod"

export const toolName = tool({
  description: "...",
  inputSchema: z.object({ ... }),
  execute: async ({ ... }) => { ... },
})
```

Look up the current `tool()` signature from AI SDK docs before writing. The shape above is structural — the exact API (inputSchema vs parameters, output vs result) changes between versions.

## Common Tool Shapes

### readFile

**Purpose:** Read file contents from the filesystem.

**Schema:**
- `path` (string) — file path to read

**Returns:** `{ content, path }`

**Security requirements:**
- Validate path doesn't escape the project root (prevent path traversal via `../`)
- Resolve the path against a configurable base directory
- Set a max file size limit (e.g., 1MB) — refuse to read larger files
- Handle encoding: default to utf-8, detect binary files and refuse gracefully
- Return a clear error for nonexistent files, not a stack trace

### writeFile

**Purpose:** Write content to a file, creating directories if needed.

**Schema:**
- `filePath` (string) — destination path
- `content` (string) — content to write

**Returns:** `{ written: filePath, bytes }`

**Security requirements:**
- Same path traversal prevention as readFile — resolve against base directory
- Create parent directories with `recursive: true`
- Don't overwrite without the agent explicitly intending to (the LLM decides, not a confirmation prompt)
- Set a max write size limit

### shellExec

**Purpose:** Execute a shell command and return output.

**Schema:**
- `command` (string) — command to execute
- `args` (string[], optional) — command arguments
- `cwd` (string, optional) — working directory

**Returns:** `{ stdout, stderr }`

**Security requirements:**
- Use `execFile` (not `exec`) to prevent shell injection — command and args are separate
- Set a timeout (default 30s, configurable)
- Set max output buffer size (default 1MB) — truncate if exceeded
- Optionally support a command allowlist for restricted agents
- Capture both stdout and stderr
- Return exit code in the result so the agent can reason about failures

**Alternative: `just-bash`** — For agents that don't need real filesystem access, use the `just-bash` package instead. It provides a virtual bash environment with in-memory filesystem, sandboxed execution, and support for common Unix commands (cat, grep, sed, awk, jq, etc.) plus optional Python/JS runtimes. Much safer than real shell access.

### searchCode

**Purpose:** Search for a pattern in files using ripgrep.

**Schema:**
- `pattern` (string) — regex pattern to search for
- `path` (string, optional) — directory to search in (default: cwd)
- `glob` (string, optional) — file glob filter (e.g., `"*.ts"`)

**Returns:** `{ matches, pattern }`

**Security requirements:**
- Depends on `rg` (ripgrep) being installed — fail clearly if not found
- Set a timeout (default 10s)
- Limit output size — ripgrep can return huge results on broad patterns
- Validate the search path is within the project root

### webSearch

**Purpose:** Search the web for information.

**Schema:**
- `query` (string) — search query

**Returns:** `{ results }` — array of title, url, snippet

**Implementation varies by provider:**
- Tavily (`tavily` package) — purpose-built for AI agents, returns structured results
- Brave Search API — free tier available, good for general search
- SerpAPI — Google results proxy
- Perplexity API — AI-summarized search results

The tool template should use an adapter pattern — the search provider is injected, not hardcoded:

```
Shape:
  webSearch tool → calls searchProvider.search(query) → returns results
  searchProvider is configured at startup, not inside the tool
```

### sandboxExec

**Purpose:** Execute code in a sandboxed environment.

**Schema:**
- `code` (string) — code to execute
- `language` (string) — programming language

**Returns:** `{ stdout, stderr }`

**Three tiers of sandboxing:**

| Tier | Package | When to use |
|------|---------|-------------|
| Virtual shell | `just-bash` | Agent needs bash-like commands without real system access |
| Managed sandbox | `e2b` | Untrusted code, full environment, managed service |
| Managed microVM | `@vercel/sandbox` | Vercel-hosted, Firecracker VMs, Node.js/Python |

Look up the current API for the chosen tier before writing. E2B and Vercel Sandbox APIs change frequently.

## MCP Client Pattern

**Purpose:** Connect to MCP servers and merge their tools with native tools.

**Shape:**
```
connectMCPTools():
  For each MCP server in config:
    Create client with transport (stdio or sse)
    Get tools from client
  Merge all MCP tools into one object
  Return { tools, clients }

closeMCPClients(clients):
  Close all clients on shutdown
```

Look up the current `createMCPClient` API from `@ai-sdk/mcp` before writing. The transport config shape and tool retrieval method change between versions.

**Key patterns:**
- Each MCP server gets its own client
- All tool objects are merged into a flat record
- Clients must be closed on agent shutdown (stdio processes leak otherwise)
- Handle connection failures gracefully — log and continue without that server's tools

## Tools Index Pattern

**Purpose:** Merge native and MCP tools into one export.

**Shape:**
```
tools/index.ts:
  Import all native tools
  Export nativeTools object

  If MCP tools chosen:
    Export async getAllTools() that merges native + MCP
  Else:
    Export getAllTools() that returns nativeTools (sync)
```

The agent.ts imports `getAllTools()` and passes the result to the agent constructor. This keeps the agent decoupled from whether tools are native or MCP.
