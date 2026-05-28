# Behavior Eval Plan

Markdown plan that drives a Claude Code subagent (or any Claude-capable LLM) to run the
behavior eval offline, without an API key. Follow the steps in order. Each scenario gets
ONE Task subagent invocation; do not batch scenarios into a single subagent call.

## Purpose

Get a primary-signal eval result without paying for real-model runs. The grader subagent
simulates what the produced agent would do for each scenario, commits to that simulated
trace, then grades it against `rubric.md`. The bias control is in the prompt sequencing —
see `rubric.md` § "Bias controls" for the contract.

## Inputs needed (read first)

Before launching any subagent, read these files INTO YOUR OWN CONTEXT:

| File | Purpose |
|------|---------|
| `.forge-state.json` (or its equivalent in the produced project) | Agent design, tools, UX policy, persona/style |
| `src/agent.ts` (or the produced project's agent entry) | The actual system prompt and tool wiring |
| `package.json` | Tool list confirmation, dependency check |
| `evals/rubric.md` | The grading procedure and score format |
| `evals/scenarios/baseline/*.yaml` | The 6 universal scenarios |
| `evals/scenarios/project/*.yaml` | Project-specific scenarios (may be empty) |

You will pass extracts from these into each subagent's prompt. The grader subagent does NOT
read the rubric file as part of its initial prompt — see § "Per-scenario procedure" step 3.

## Per-scenario procedure

For each scenario YAML file:

### 1. Load the scenario

Read the YAML. Extract `id`, `name`, `level`, `applicability`, `input`, `expect`, `rubric`.

### 2. Check applicability

For each expression in `applicability`, evaluate against `.forge-state.json`. Use the
mini-grammar described in `README.md` § "Applicability mini-grammar":

- `<path> <op> <value>` where `<op>` is one of `==`, `!=`, `in`, `not_in`, `exists`,
  `not_exists`, `any:<predicate>`, `none:<predicate>`.

If ANY expression evaluates to `false`, mark the scenario as `skipped` and write a row to
the results file:

```json
{"scenario_id": "<id>", "status": "skipped", "status_reason": "applicability: <expr> evaluated false", "graded_at": "<ISO>"}
```

Continue to the next scenario.

### 3. Build the grader subagent prompt

The grader gets a strict, sequenced prompt. The information sequence MUST match the
procedural sequence — the prompt does NOT contain the scenario's `expect`/`rubric`
sections. The grader only loads them after committing to the trace, via the Read tool.
This makes bias control structural rather than self-discipline.

Use this template verbatim:

```
You are grading one scenario for an agent's behavior eval. Follow this procedure exactly.
You will receive design + input now, and load criteria yourself later via the Read tool.

[Agent design — DO NOT skip any field]
  System prompt:
    <paste state.agent.systemPrompt, full text>
  Tools available to the agent:
    <paste, one per line: name + one-line purpose, from state.tools.custom and state.tools.mcpServers>
  UX policy:
    streaming:       <state.ux.streaming>
    tool_failure:    <state.ux.errorPolicy.tool_failure>
    llm_failure:     <state.ux.errorPolicy.llm_failure>
    rate_limit:      <state.ux.errorPolicy.rate_limit>
    persistence:     <state.ux.persistence>
  Persona / context:
    style:    <state.context.style>
    audience: <state.context.audience>
    intent:   <state.context.intent>

[Scenario INPUT only — criteria are NOT included here on purpose]
  scenario_id:   <id>
  scenario file: <absolute path to evals/scenarios/{baseline,project}/<id>.yaml>
  user message:  <input.user>
  history:       <input.history (if any), formatted as turns>
  context:       <input.context (any notes from the scenario)>

[Procedure — follow in order, no shortcuts]
  Step A. Predict what the REAL agent above would do, step by step, given the input.
          Emit this as a structured trace with these event types:
            - user_message
            - assistant_text (one event per chunk if streaming is on)
            - tool_call (with name + args)
            - tool_result (simulate the most plausible result given the tool and args)
            - approval_request (if a HITL tool is about to fire)
            - end_turn
          Number events as you write them: assistant_text#1, tool_call#1, etc. This lets
          you cite specific events when grading.

          You do NOT yet have the scenario's expect/rubric block — that is intentional.
          You will read it only after committing to the trace. Write the trace as your
          honest best prediction of what the agent above would do.

  Step B. After the trace is complete, emit a literal sentinel line on its own:
              --- TRACE COMMITTED ---
          You MUST NOT edit the trace text above this line for the rest of this turn.

  Step C. NOW use the Read tool to load:
            1. evals/rubric.md                              (the grading procedure)
            2. <the scenario file path provided above>      (its expect / rubric blocks)
          You did not have these before this step. Read both files in full before scoring.

  Step D. Score the trace against each item in expect.must, expect.should, expect.must_not.
          For each item, decide met / not_met / partial. Cite the specific trace event
          by its label (e.g., tool_call#1) as evidence_trace_event. If a criterion is
          unmet because the relevant event never appeared in the trace, set
          evidence_trace_event to null and explain in notes.

          IF SCORING A CRITERION WOULD CHANGE THE TRACE YOU WROTE: do NOT edit the trace.
          Mark the criterion failed or partial and explain in notes why the trace as
          written does not satisfy it. Honest failure is cheaper than retroactive editing.

  Step E. Emit the final JSON score object per the format in rubric.md § "Score format".
          The simulated_trace field is the verbatim trace text from above the
          --- TRACE COMMITTED --- sentinel.
```

The prompt deliberately omits `expect.must`, `expect.should`, `expect.must_not`, and any
rubric guidance. The Read tool in Step C is the ONLY channel through which the grader
learns the criteria. This makes the bias control structural — the grader literally does
not have the criteria text in its context at trace-writing time.

### 4. Launch the grader subagent (Task tool)

Pass the prompt above. The subagent emits the trace, the sentinel, the scoring section,
and the final JSON. Capture the entire output.

### 5. Append the result

Append the JSON object as one line to `evals/results/<ISO-timestamp>.jsonl`. The timestamp
is fixed for the WHOLE run — every scenario in a single run goes into the same file. Use
the timestamp of the run's start, not per scenario.

Validate the JSON parses before appending. If the subagent's output is malformed (no
sentinel, missing fields, broken JSON), write a row with `status: "fail"` and
`status_reason: "grader output malformed: <details>"`. Do not retry — flag and continue.

## After all scenarios

### Reporting

Read `evals/results/<ISO-timestamp>.jsonl` and produce a summary:

```
Behavior eval — <ISO-timestamp>
────────────────────────────────────────────────────────
  Scenarios run:    <N>
  Pass:             <count>  (<%>)
  Partial:          <count>
  Fail:             <count>
  Skipped:          <count>   (applicability conditions)

  Top failing criteria (across all scenarios):
    1. <criterion>           (<N> scenarios)
    2. <criterion>           (<N> scenarios)
    3. <criterion>           (<N> scenarios)

  Per-scenario:
    [PASS] 01-boot               all must met
    [FAIL] 02-tool-call          must: "agent emits at least one tool_call event" not met
    [PASS] 03-persona-style      style match (one minor partial on emoji avoidance)
    ...

  Raw results: evals/results/<ISO-timestamp>.jsonl
```

### Iteration loop

If the user wants to fix failures, walk through `rubric.md` § "Iteration: surfacing which
design lever to pull". For each top-3 failing criterion, identify the likely design lever:

- Persona/style misses → `agent.systemPrompt`
- Tool not called when expected → tool description OR system prompt mention
- Tool called when not needed → system prompt over-encourages tool use, or remove the tool
- Error policy violations → `ux.errorPolicy` wiring in the harness snippet
- HITL bypassed → `requireApproval` flag on the tool config

Surface — don't auto-fix. The user makes the call on which lever to pull and re-runs the
eval to confirm.

## How to invoke from Claude Code

Two routes:

1. **From the produced project's repo**, with the agent-forge skill installed: the user
   types `/eval-behavior` (or whatever slash is wired) and Claude Code reads this plan as
   its instructions.

2. **From a fresh Claude Code session**: paste this file as context, point at the produced
   project's `evals/`, and Claude follows the plan. Inputs are local files; no API key is
   needed for the grading itself (grader runs on Claude Code's own model budget).

The package.json snippet ships an `eval:behavior` script that simply prints "Open
evals/run-behavior.md in Claude Code and run the plan" — there's no automated runner because
the plan IS the runner. The Task tool is the engine.

### Degraded mode: Task tool unavailable

If the runner is itself a subagent or the harness otherwise lacks nested `Task`, the
structural bias control (criteria literally not in the grader's context until it Reads them)
is unavailable. Use the **manual fallback** explicitly — do NOT silently drop the discipline:

1. State to the user up-front: "Task tool unavailable; running in degraded bias-control mode."
2. For each scenario, write the simulated trace in a single block ending with the literal
   sentinel `--- TRACE COMMITTED ---`. Do not begin grading any scenario until ALL traces
   are committed (this is the discipline equivalent of Task isolation).
3. After the last `--- TRACE COMMITTED ---`, load `rubric.md` (you may already have it in
   context — note that as the bias-control concession). Grade each trace independently.
4. Do NOT edit any committed trace. If a trace turns out to be wrong, discard the eval row
   for that scenario and re-run — never retroactively edit.
5. In the results JSONL row, set `bias_control: "structural"` (Task isolated) or
   `"sentinel-only"` (degraded mode). Downstream readers can filter on this.

The wiki-agent first-run eval (2026-05-26) exercised this degraded mode and found 11/12
pass. The result is a structured prediction, not an independent empirical check — qualify
the verdict accordingly. See `PATTERN_LEDGER.md` § agent-skill-bridge for the framing.

## Failure modes of the plan itself

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Grader emits scoring before the sentinel | Sequencing instructions not followed | Re-launch with the exact prompt above; do not abbreviate Step A |
| Grader edits the trace after Step C | Bias control violated | Discard the result row, re-launch with the anti-rationalization clause emphasized |
| All scenarios skipped | Applicability expressions failing — state.json missing or paths wrong | Verify `.forge-state.json` exists at the produced project root and matches `references/state-schema.md` |
| Grader hallucinates tool names | Insufficient tool list in the prompt | Pass the EXACT names from state.tools, not abbreviated descriptions |
| Drift between simulated and real traces (revealed by run-real-model.ts) | Subagent's model has shifted, or system prompt is ambiguous | Tighten the system prompt; or accept the drift and treat real-model as the source of truth for affected scenarios |
