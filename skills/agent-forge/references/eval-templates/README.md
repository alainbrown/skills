# Eval Templates

Canonical eval scaffolding that `agent-forge` Stage 7 (`eval`) copies into every produced
project's `evals/` directory. The produced project then runs evals at three levels — smoke
(plumbing), behavior (subagent-as-LLM, primary signal), and real-model (optional spot-check).

This template replaces the older single-pass `verify` step. The smoke level alone preserves
what `verify` did before; behavior adds the new primary signal; real-model is the optional
expensive escape hatch.

## The three levels

| Level | What it tests | Needs API key? | Runner |
|-------|---------------|----------------|--------|
| `smoke` | Install, types, unit tests, boot test (≥1 tool call, non-empty output) | No (skips boot test if key absent) | `bash evals/run-smoke.sh` |
| `behavior` | Scenario outcomes graded by a subagent simulating the agent | No | Open `evals/run-behavior.md` in Claude Code and follow the plan |
| `real-model` | Spot-check a subset against an actual model; compare with simulated trace | Yes (`ANTHROPIC_API_KEY` or equivalent) | `tsx evals/run-real-model.ts` |

Behavior is the primary signal because it works offline and at zero cost. Real-model exists
so the user can periodically confirm that the subagent-as-LLM simulation generalizes — drift
between simulated and real traces means the simulation has gotten stale.

## File layout

```
evals/
├── README.md                  ← this file (kept in produced project)
├── rubric.md                  ← grading rubric the behavior-eval subagent follows
├── run-smoke.sh               ← bash: install + typecheck + test + boot smoke
├── run-behavior.md            ← Claude-Code plan for the behavior eval
├── run-real-model.ts          ← TypeScript: subset of scenarios against a real model
├── scenarios/
│   ├── baseline/              ← shipped with the template; six universal scenarios
│   │   ├── 01-boot.yaml
│   │   ├── 02-tool-call.yaml
│   │   ├── 03-persona-style.yaml
│   │   ├── 04-error-policy.yaml
│   │   ├── 05-streaming.yaml
│   │   └── 06-hitl-approve.yaml
│   └── project/               ← agent-forge Stage 7 writes 2-3 project-specific scenarios here
└── results/                   ← <ISO-timestamp>.jsonl per run, one row per scenario
```

## Customization from state

The eval template is COPYABLE as-is. The skill parameterizes from `.forge-state.json`:

| Read from state | Used by |
|-----------------|---------|
| `state.agent.systemPrompt` | Grader subagent prompt (so it can simulate what the agent would say) |
| `state.tools` + per-tool `requireApproval` flag (see HITL convention below) | `02-tool-call.yaml` applicability; `06-hitl-approve.yaml` applicability |
| `state.context.style`, `state.context.audience` | `03-persona-style.yaml` grading anchors |
| `state.ux.errorPolicy.tool_failure` | `04-error-policy.yaml` expected behavior branch |
| `state.ux.streaming` | `05-streaming.yaml` applicability |
| `state.context.userSummary` | Project-specific scenarios under `scenarios/project/` |

### HITL convention

There is no top-level `state.ux.hitl` field in the state schema. The behavior eval determines
HITL applicability by scanning `state.tools.custom[*]` and `state.tools.mcpServers[*]` for a
`requireApproval: true` field. Producers (including agent-forge Stage 4) set this on any
tool that pauses for user approval. If you adopt a different convention in your project, edit
the applicability expression in `06-hitl-approve.yaml`.

## Scenario schema

Every YAML file under `scenarios/` follows this shape:

```yaml
id: 01-boot
name: "Agent boots and responds to a basic prompt"
level: behavior          # smoke | behavior | real-model
applicability:           # list of state-expression strings (tiny grammar, see below)
  - "state.ux.streaming != 'none'"
input:
  user: "hello"
  history: []            # optional prior conversation turns
  context:               # extra context the grader can use when simulating
    timeOfDay: "morning"
expect:
  must:                  # hard pass/fail criteria
    - "agent responds within 5 seconds"
    - "response is non-empty"
  should:                # soft criteria (recorded but not blocking)
    - "tone matches state.context.style"
  must_not:              # negative criteria (any hit = fail)
    - "agent invents facts about the user"
rubric:
  scoring: "binary"      # binary | rubric-3 | rubric-5
  notes: "Pass if all 'must' items are satisfied."
```

### Applicability mini-grammar

One expression per list item. Each is a single boolean clause:

```
<path> <op> <value>
```

- `<path>` — dotted into the state object, e.g. `state.ux.streaming`, `state.tools.custom`,
  `state.harness.name`.
- `<op>` — one of: `==`, `!=`, `in`, `not_in`, `exists`, `not_exists`, `any`, `none`.
- `<value>` — JSON literal (`'none'`, `true`, `42`, `['a','b']`). For `any` / `none` the operand
  is a sub-expression applied per element, written `any:<predicate>` (e.g. `state.tools.custom any:requireApproval == true`).

If a scenario lists multiple expressions in `applicability`, ALL must be true (AND). If the
list is empty or absent, the scenario always runs.

For OR semantics, wrap two or more expressions with `any_of:`:

```yaml
applicability:
  - "any_of: [state.tools.custom any:requireApproval == true, state.tools.mcpServers any:requireApproval == true]"
```

The wrapper evaluates true if at least one inner expression is true. `any_of:` items can
appear alongside plain expressions in the same `applicability` list — the AND across list
items still applies (so a list with one `any_of:` and one plain expression requires the
`any_of:` to be true AND the plain expression to be true).

The smoke runner ignores `applicability` (smoke is unconditional plumbing). The behavior and
real-model runners evaluate it against `.forge-state.json` (or the produced project's equivalent)
before launching the grader subagent.

## How to run

```bash
pnpm eval            # smoke + behavior (no API key needed)
pnpm eval:smoke      # plumbing only
pnpm eval:behavior   # opens the plan; user follows it in Claude Code
pnpm eval:real       # real-model spot-check (requires API key)
```

See `package.json.snippet` for the script entries to add to the produced project's
`package.json`.

## The grader subagent contract

Behavior evals work by spawning ONE subagent per scenario. The subagent receives:

1. The agent's design (system prompt + tool list + UX policy) read from `src/agent.ts` and
   `.forge-state.json`.
2. The scenario YAML (`input`, `applicability`, but NOT yet `expect`/`rubric`).
3. Instructions to first emit a `simulated_trace` (its best guess at what the agent would
   actually output), commit to that trace, then read the rubric file and grade.

Bias-control is the load-bearing part: the trace must be written and committed before the
grader sees the criteria. See `rubric.md` for the full procedure and `run-behavior.md` for
how Claude Code drives it.

**Degraded mode (Task tool unavailable).** When the runner is itself a subagent or the
harness otherwise lacks nested `Task`, the structural bias control (criteria literally not
in the grader's context until it Reads them) is unavailable. The documented fallback is
sentinel + discipline: write all simulated traces in a single block, each ending with
`--- TRACE COMMITTED ---`, before loading the rubric. Do not retroactively edit a committed
trace. Tag each results JSONL row with `bias_control: "sentinel-only"` so downstream readers
can filter. See `run-behavior.md` § "Degraded mode" for the full protocol. Verdicts produced
in degraded mode are structured predictions, not independent empirical checks — qualify them
accordingly when reporting.

If the produced project doesn't have Claude Code wired, the user runs `run-behavior.md`'s plan
manually from any Claude-capable LLM by feeding the plan + state + scenarios as input.

## When to add project-specific scenarios

The baseline covers the universal failure modes (boot, tool use, persona, error policy,
streaming, HITL). Add scenarios under `scenarios/project/` for:

- Domain-specific reasoning the agent must do correctly (e.g., a code-review agent must
  not approve obvious SQL injection)
- Multi-turn workflows that exercise persistence
- Tool-combination paths the agent should/shouldn't take
- Regression tests for bugs the user has hit in production

`agent-forge` Stage 7 writes 2-3 of these automatically from `state.context.userSummary`;
add more by hand. Each is a YAML file with the same schema as baseline.

## Reading results

`results/<ISO-timestamp>.jsonl` contains one row per scenario with the shape defined in
`rubric.md`. Compare runs over time by diffing two files; behavior shifts are the most
interesting signal as the agent's design evolves.
