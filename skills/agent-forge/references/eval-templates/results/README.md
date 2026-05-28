# Results

Eval results land here as `<ISO-timestamp>.jsonl` files. One row per scenario per run.

## Schema

Each line is a JSON object per the format defined in `../rubric.md` § "Score format". The
required fields:

- `scenario_id` — matches the YAML's `id` field
- `scenario_level` — `smoke` | `behavior` | `real-model`
- `status` — `pass` | `fail` | `partial` | `skipped`
- `status_reason` — short string for the headline why
- `must_results`, `should_results`, `must_not_results` — per-criterion grading detail
- `notes` — grader's reasoning that doesn't fit the structured fields
- `simulated_trace` — the trace text the grader committed to (only for behavior level)
- `real_trace` — the trace from the real model (only for real-model level)
- `drift_vs_simulated` — `none` | `minor` | `major` | `no-baseline` (real-model rows only)
- `graded_at` — ISO timestamp

## File naming

- Behavior runs: `<ISO-timestamp>.jsonl` (e.g., `2026-05-26T11-42-01.jsonl`)
- Real-model runs: `<ISO-timestamp>-real.jsonl`

## Use over time

Compare two runs by diffing two jsonl files. The interesting signal is behavior shifts as
the agent's design evolves — system prompt edits, tool changes, UX policy adjustments. A
regression in pass rate after a prompt edit is a sign to revert or refine.

The `simulated_trace` field is the load-bearing artifact for behavior-vs-real drift
analysis. Keep it readable (it's intentionally verbose).
