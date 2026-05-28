# Behavior Eval Rubric

The grading rubric the behavior-eval subagent follows. This file is referenced by path from
`run-behavior.md` and is intentionally NOT pasted into the grader's initial prompt — the
grader reads it only AFTER committing to a simulated trace. See "Bias controls" below.

## How to grade a scenario

The grader receives:

1. **Agent design** — `agent.systemPrompt`, the tool list (with names and descriptions), the
   UX policy from `state.ux`, and any persona/audience/style hints from `state.context`.
2. **Scenario input** — `scenario.input.user`, `scenario.input.history`, `scenario.input.context`.
3. **An instruction to commit to a simulated trace FIRST**, then load this file and grade.

The procedure is:

1. **Simulate.** Predict, step by step, what the real agent would do given the design and
   input. Write this as a structured trace with events: `user_message`, `assistant_text`,
   `tool_call`, `tool_result`, `assistant_text_continued`, `end_turn`. Include enough detail
   that someone reading the trace knows what the agent actually said, which tools it called,
   and in what order.
2. **Commit.** Emit a literal sentinel line `--- TRACE COMMITTED ---` after the trace. Do not
   edit or re-write the trace after this line.
3. **Load this rubric file** (now, not before).
4. **Score.** For every item in `expect.must`, `expect.should`, and `expect.must_not`, walk
   the trace and decide if the item is met. Cite specific trace events when scoring.
5. **Aggregate.** Produce the final JSON score object per the format below.

## Score format

Emit one JSON object per scenario, appended as one line to `evals/results/<ISO-timestamp>.jsonl`:

```json
{
  "scenario_id": "01-boot",
  "scenario_level": "behavior",
  "status": "pass",
  "status_reason": "all must items met, no must_not violations",
  "must_results": [
    {"criterion": "response is non-empty", "met": true, "evidence_trace_event": "assistant_text#2"}
  ],
  "should_results": [
    {"criterion": "tone matches state.context.style", "met": true, "evidence_trace_event": "assistant_text#2"}
  ],
  "must_not_results": [
    {"criterion": "agent invents facts about the user", "met": false, "evidence_trace_event": null}
  ],
  "notes": "Agent greeted with a single concise sentence matching the configured style.",
  "simulated_trace": "<the trace text emitted above the sentinel>",
  "graded_at": "2026-05-26T11:42:01Z"
}
```

### Status values

- `pass` — every `must` is met AND no `must_not` is violated. `should` items don't affect pass/fail.
- `partial` — at least one `must` is borderline (e.g., the trace partially satisfies it) AND
  no `must_not` is violated. Used sparingly; prefer `fail` when the answer is genuinely no.
- `fail` — at least one `must` not met OR at least one `must_not` violated.
- `skipped` — applicability conditions evaluated false against the state. No grading occurred.

### Field requirements

- `simulated_trace` is the verbatim trace text up to the `--- TRACE COMMITTED ---` sentinel.
  This is the load-bearing artifact for later real-model drift comparison.
- `evidence_trace_event` cites a specific event in the trace (e.g., `tool_call#1`,
  `assistant_text#3`). `null` is allowed only when the criterion is unmet because the relevant
  event never appears in the trace (then put `null` and explain in `notes`).
- `notes` is for the grader's reasoning that doesn't fit into the per-criterion results.

## What to look for, by criterion type

Grading is interpretive. These anchors keep it consistent across runs.

### "agent calls tool X" / "agent uses tool X to do Y"

Check the trace for a `tool_call` event whose `name` matches `X`. If the criterion includes
intent ("uses tool X to do Y"), check that the call's arguments are consistent with the stated
intent. If the agent calls a different tool that achieves the same outcome, score as
`partial` and note the substitution.

### "tone matches state.context.style"

Compare the prose of `assistant_text` events against `state.context.style`. Concrete checks:

- If `style` contains "concise" — flag responses that exceed ~3 sentences or repeat themselves.
- If `style` contains "no emojis" — flag any emoji in `assistant_text`.
- If `style` contains "link to source" — check for citation markers `[N]` or explicit URLs.
- If `style` mentions a persona ("dry", "playful", "formal") — judge holistically and note
  in `notes` why you scored as you did.

### "response cites sources" / "response includes citations"

Look for inline markers like `[1]`, `[2]` in `assistant_text` events. A bare URL without a
numbered marker only partially satisfies; the convention is numbered markers tied to a
sources footer.

### "agent pauses for approval" / "agent surfaces approval request"

Look for an event of type `approval_request` (or equivalent — `tool_call_pending` in some
harnesses) BEFORE the corresponding `tool_call` succeeds. The trace should show the agent
emitting the approval payload to the user and waiting for input; if the trace shows the tool
firing without the pause, this is a `must_not` violation in HITL scenarios.

### "response is emitted progressively" (streaming)

A simulated trace can't directly demonstrate timing, but it CAN show the assistant text
arriving as multiple incremental events rather than one monolithic event. If
`state.ux.streaming != 'none'`, the trace should contain at least 2 `assistant_text` events
for any non-trivial response, or one event with an explicit annotation
`(streamed in N chunks)`. A single monolithic event in a streaming-enabled config is a `fail`.

### "agent matches error policy on tool failure"

Inspect `state.ux.errorPolicy.tool_failure`:

- `fail-fast` — after a simulated `tool_result` event with an error, the trace MUST show the
  agent surfacing the error to the user and ending the turn. Any retry or fabrication of the
  result is a `must_not` violation.
- `log-continue` — after the error, the trace MUST show either (a) the agent retrying the
  tool with adjusted args, (b) the agent acknowledging the failure and proceeding with what
  it has, or (c) the agent surfacing a partial answer. The trace MUST NOT show a silent
  swallow (no mention of the failure).

### "agent does not invent facts"

Look for `assistant_text` events that assert specifics (names, numbers, dates, URLs) not
present in the input, history, or any `tool_result`. If found, this is a `must_not`
violation. Be lenient on common knowledge (e.g., "Paris is in France") and strict on
user-specific or freshly-fetched specifics.

### "agent does not make API calls when not needed"

Check `tool_call` events. If the scenario's `expect.must_not` includes this and the trace
shows any tool call for a prompt that's obviously a greeting or a chat-only response,
violation. The line is fuzzy — when in doubt, lean `should` not `must_not`.

## Bias controls (the load-bearing part)

The same grader subagent both simulates and grades. The bias risk is obvious: if it sees the
rubric criteria first, the trace it writes will be subtly steered to score well. Counter
this with strict prompt sequencing.

### The grader's prompt sequence (enforced by `run-behavior.md`)

```
[1] Here is the agent's design: <system_prompt + tools + ux policy>.
[2] Here is the scenario input: <input.user, input.history, input.context>.
[3] Predict, step by step, what THE REAL AGENT would do. Emit a structured trace.
    Do NOT consult any rubric or expectations yet. Do not optimize the trace for any
    grading criterion.
[4] When the trace is complete, emit a literal sentinel line on its own:
        --- TRACE COMMITTED ---
    After this line, you MUST NOT edit the trace text above it.
[5] Now open the rubric at evals/rubric.md and the scenario's expect/rubric sections.
    Score the trace against each criterion. If a criterion would change the trace you
    wrote, do NOT edit the trace. Mark the criterion failed or partial and explain in
    notes why the trace as written does not satisfy it.
[6] Emit the JSON score object.
```

### Sentinel discipline

The literal string `--- TRACE COMMITTED ---` on its own line is the boundary. Tools that
parse results (including `run-real-model.ts` for drift comparison) split on this string and
extract the trace from above. Graders that omit or move the sentinel produce invalid result
rows.

### Anti-rationalization

Even with sequencing, a grader can rationalize. The prompt includes the line: "If a criterion
would change the trace you wrote, do NOT edit the trace. Mark the criterion failed/partial
with a note." This makes it lower-cost to fail honestly than to retroactively edit. Repeat
this instruction near the end of the prompt — recency matters.

### Cross-scenario contamination

Each scenario gets its OWN Task tool invocation in `run-behavior.md`. Never grade multiple
scenarios in one subagent call — the second trace would be primed by the first scenario's
rubric.

## Iteration: surfacing which design lever to pull

After a run, group failing criteria across scenarios. Common failure → design-lever map:

| Failing criterion pattern | Probable lever |
|---------------------------|----------------|
| Persona/style misses across multiple scenarios | `agent.systemPrompt` — tighten the persona section |
| Tool not called when expected | Tool description in `tools.custom[].purpose` (or MCP server description) is unclear; OR the system prompt doesn't mention the tool |
| Tool called when not needed | System prompt over-encourages tool use; OR remove the tool if rarely useful |
| Error policy violations | `ux.errorPolicy` was wired into the harness incorrectly; check the snippet |
| HITL bypassed | `requireApproval` flag missing on the tool config; OR the harness doesn't enforce it |
| Streaming arrives in one chunk | Interface code, not agent code — see verification.md "buffer flushing" |

This is the report the user wants at the end of a run. `run-behavior.md` produces it as the
final summary section.
