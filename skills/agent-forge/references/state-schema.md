# .forge-state.json Schema

The produced-agent project's state file (separate from the skill's own state). Lives in the
project root during the build, deleted after `verify` succeeds.

## Schema

```jsonc
{
  // Workflow tracking
  "phase": "capabilities|harness|interface|tools|ux|mock|generate|eval|done",
  "iteration": 0,
  "mode": "interactive|auto",

  // The agent's identity
  "agent": {
    "name": "kebab-case-name",
    "description": "one-line description",
    "systemPrompt": "the actual system prompt — drafted in capabilities, finalized in ux"
  },

  // Captured user context — informs system prompt and design choices
  "context": {
    "userSummary": "what the user said about what they want",
    "intent": "inferred purpose",
    "audience": "who uses this agent",
    "style": "tone / voice / persona preferences",
    "futureConsiderations": "things the user mentioned for later"
  },

  // Capabilities — drives harness selection
  "capabilities": {
    "domain": "coding|general|data|creative|customer-support|other",
    "interactivity": "chat|batch|background",
    "channels": ["cli", "web", "electron", "slack", "discord", "telegram", "email"],
    "multiAgent": false,
    "modalities": ["vision", "voice", "files"],
    "scheduling": false,
    "languagePreference": "ts",
    "providerFlexibility": "locked|swappable|openai-compatible|undecided",
    "mcp": "must|nice-to-have|no"
  },

  // Harness decision
  "harness": {
    "track": "A|B",
    "name": "vercel-ai-sdk|openai-agents-sdk|langgraph|mastra|opencode|openclaw",
    "rationale": "why this fits",
    "alternatives_considered": ["other names"],
    "forkSubsystems": {                        // Track B only
      "kept": ["subsystem-id", "..."],
      "discarded": ["subsystem-id", "..."]
    }
  },

  // Interface choice(s)
  "interface": {
    "primary": "cli|web|electron",
    "additional": ["cli", "web"],              // optional second/third
    "harnessIntegrationCost": "trivial|easy|medium|hard"
  },

  // Tool selection
  "tools": {
    "builtinKept": ["tool-name"],              // Track B — kept built-in tools
    "mcpServers": [
      {
        "name": "filesystem",
        "purpose": "read/write project files",
        "envVars": [],
        "package": "@modelcontextprotocol/server-filesystem"
      }
    ],
    "custom": [
      {
        "name": "tool-name",
        "purpose": "what it does",
        "signature": "TypeScript signature"
      }
    ]
  },

  // Agent UX policy — user-controlled
  "ux": {
    "errorPolicy": {
      "tool_failure": "fail-fast|log-continue",
      "llm_failure": "fail-fast|retry|fallback",
      "rate_limit": "fail-fast|wait-retry"
    },
    "streaming": "token|message|none",
    "persistence": "none|sqlite|disk-json"
  },

  // Mock-iterate outputs — Stage 5.5
  "mock": {
    "skipped": false,                          // user said "just build it"
    "approved": false,                         // gate to Stage 6 (unless skipped)
    "scratchDir": "/abs/path/to/.forge-mock",  // copied/renamed to <project>/mocks/ in Stage 6
    "serverPid": null,                         // npx serve background process; cleared after kill
    "iterations": [                            // each round of user feedback
      {
        "ts": "ISO-8601",
        "feedback": "shorten approval panel; move tool list to top",
        "filesEdited": ["index.html"]
      }
    ]
  },

  // Eval outputs — Stage 7
  "eval": {
    "smoke": {
      "ran": false,
      "passes": 0,
      "skips": 0,
      "fails": 0,
      "log": "/abs/path/to/evals/results/smoke-<timestamp>.txt"
    },
    "behavior": {
      "ran": false,
      "scenariosRun": 0,
      "scenariosSkipped": 0,
      "pass": 0,
      "partial": 0,
      "fail": 0,
      "results": "/abs/path/to/evals/results/<ISO-timestamp>.jsonl",
      "topFailingCriteria": [                  // surfaced when > 30% of scenarios fail any criterion
        { "criterion": "agent calls wiki_skill_lookup before ingest", "occurrences": 4 }
      ]
    },
    "realModel": {
      "ran": false,                            // false if no API key set
      "scenariosRun": 0,
      "driftFromSimulation": 0                 // count of scenarios where simulated vs real diverged
    }
  },

  // Project metadata
  "project": {
    "path": "/abs/path/to/produced/project",
    "language": "ts",
    "packageManager": "pnpm|uv|cargo|go"
  },

  // Audit trail
  "decisions": [
    {
      "stage": "harness",
      "choice": "claude-agent-sdk",
      "reason": "TS preference + MCP must + coding domain",
      "timestamp": "ISO-8601"
    }
  ],

  "cascadeChanges": [
    {
      "stage": "harness",
      "from": "claude-agent-sdk",
      "to": "openai-agents-sdk",
      "reason": "user added voice capability in Stage 4, switched recommendation",
      "timestamp": "ISO-8601"
    }
  ]
}
```

## Field reference

**`phase`** — current stage. Used to resume after compression. Always update before moving on.

**`agent.systemPrompt`** — start with a draft in Stage 1, finalize in Stage 5. Should reflect
the user's stated persona, audience, and constraints. NEVER "you are a helpful AI assistant."

**`capabilities`** — every later stage reads this. Adding/changing a capability after Stage 2 is
a cascade trigger.

**`harness.forkSubsystems`** — Track B only. `kept` are subsystem IDs the user checked (see
the harness's profile for the full list); `discarded` are unchecked. The Core generation
subagent uses this to vendor only kept code.

**`tools.mcpServers[].package`** — npm package name. The generation subagent
adds these to the dependency manifest and writes the MCP server config.

**`ux.errorPolicy`** — one entry per error category. Skill defaults to fail-fast, user can
override per category.

**`mock`** — Stage 5.5 outputs. `approved=true` is the gate to Stage 6 (unless `skipped=true`).
`scratchDir` holds the in-progress mock files while the user reviews; Stage 6 moves it to
`<project>/mocks/` after approval. For api interfaces, `<scratchDir>/openapi.yaml` is also copied
to `<project>/openapi.yaml` as the production contract. `serverPid` tracks the `npx serve`
background process so it can be cleanly killed at approval time. Every round of feedback appends
to `iterations` — useful audit trail when reviewing later why the mock looks the way it does.

**`eval`** — Stage 7 outputs (three levels). `smoke` covers what the old `verify` stage did
(install, typecheck, test, boot smoke). `behavior` is the primary signal — subagent-as-LLM
grader runs each scenario, produces a simulated trace and rubric-based score, results land in
`<project>/evals/results/<ISO-timestamp>.jsonl`. `topFailingCriteria` is populated when any
criterion fails in >30% of scenarios — surfaces design issues the user should re-interview
the implicated stage for. `realModel` only runs if an API key is set; tracks drift between
simulated and real traces (high drift means the subagent-as-LLM simulation isn't generalizing).

**`cascadeChanges`** — every time the skill surfaces an invalidation and the user
agrees to switch, log it here. Useful debugging if the produced project doesn't match expectations.

## Worked example (abbreviated)

**Illustrative only.** The scenario below was picked because its cascade is genuinely a tie — none of the shortlisted harnesses has a strong claim. The `harness.name` shown is one of several reasonable picks; the cascade walk on this brief would surface the ambiguity and ask the user, not auto-pick. Do not read this as "personal-todo CLI agents should use vercel-ai-sdk."

```jsonc
{
  "phase": "eval",
  "mode": "interactive",
  "agent": {
    "name": "example-agent",
    "description": "A personal todo-list CLI manager",
    "systemPrompt": "You are example-agent, a terse assistant that helps the user track personal todos..."
  },
  "context": {
    "userSummary": "I want a simple CLI tool for managing my personal todo list. Just me using it.",
    "audience": "single user (the developer)",
    "style": "terse; output should fit a 80-column terminal"
  },
  "capabilities": {
    "domain": "general",
    "interactivity": "chat",
    "channels": ["cli"],
    "multiAgent": false,
    "scheduling": false,
    "languagePreference": "ts",
    "providerFlexibility": "swappable",
    "mcp": "no"
  },
  "harness": {
    "track": "A",
    "name": "vercel-ai-sdk",
    "rationale": "Cascade tie — vercel-ai-sdk, mastra, langgraph all satisfy the deps. Picked vercel-ai-sdk as the leanest of the three for an underspecified brief. With a real user this would surface as a tie-breaker question."
  },
  "interface": {
    "primary": "cli",
    "additional": [],
    "harnessIntegrationCost": "trivial"
  },
  "tools": {
    "mcpServers": [],
    "custom": []
  },
  "ux": {
    "errorPolicy": { "tool_failure": "fail-fast", "llm_failure": "retry", "rate_limit": "wait-retry" },
    "streaming": "token",
    "persistence": "sqlite"
  },
  "mock": {
    "skipped": false,
    "approved": true,
    "scratchDir": "/Users/example/code/example-agent/.forge-mock",
    "serverPid": null,
    "iterations": [
      { "ts": "2026-05-26T11:42:01Z", "feedback": "tighter prompt padding in the welcome banner", "filesEdited": ["transcripts.md"] },
      { "ts": "2026-05-26T11:48:33Z", "feedback": "looks good, approve", "filesEdited": [] }
    ]
  },
  "eval": {
    "smoke": { "ran": true, "passes": 4, "skips": 1, "fails": 0, "log": "/Users/example/code/example-agent/evals/results/smoke-2026-05-26T12-03-00.txt" },
    "behavior": {
      "ran": true,
      "scenariosRun": 5,
      "scenariosSkipped": 1,
      "pass": 5,
      "partial": 0,
      "fail": 0,
      "results": "/Users/example/code/example-agent/evals/results/2026-05-26T12-15-00.jsonl",
      "topFailingCriteria": []
    },
    "realModel": { "ran": false, "scenariosRun": 0, "driftFromSimulation": 0 }
  },
  "project": {
    "path": "/Users/example/code/example-agent",
    "language": "ts",
    "packageManager": "pnpm"
  }
}
```
