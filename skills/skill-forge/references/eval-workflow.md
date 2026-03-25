# Eval Workflow Reference

Schemas, grading formats, and tooling for Phase 3: Test & Iterate.

## File Formats

### rubric.json

Save success criteria to `evals/rubric.json`:

```json
{
  "skill_name": "<name>",
  "criteria": [
    { "id": 1, "name": "short descriptive name", "description": "what good looks like for this criterion" },
    { "id": 2, "name": "...", "description": "..." }
  ]
}
```

Share with the user for review before proceeding.

### evals.json

Save test cases to `evals/evals.json` in the skill directory:

```json
{
  "skill_name": "<name>",
  "evals": [
    {
      "id": 1,
      "name": "descriptive-name",
      "prompt": "realistic user prompt",
      "expected_output": "what good output looks like",
      "files": []
    }
  ]
}
```

### grading.json

Save per-eval grading to `grading.json`:

```json
{
  "eval_name": "descriptive-name",
  "criteria": [
    {
      "name": "criterion name",
      "with_skill": { "score": "win|tie|lose", "evidence": "brief explanation" },
      "baseline": { "score": "win|tie|lose", "evidence": "brief explanation" }
    }
  ]
}
```

A "win" means that variant handled this criterion well. A "lose" means it didn't. A "tie" means both were comparable.

## Review Viewer

After grading, always launch the interactive review server. It shows outputs side-by-side with rubric grades and lets the user agree/disagree per criterion with inline notes.

### Interactive mode (default)

```bash
node <scripts>/generate-review.mjs \
  <workspace>/iteration-N \
  --skill-name "<name>" \
  --rubric <evals>/rubric.json \
  --benchmark <workspace>/iteration-N/benchmark.json
```

This starts a local server (default port 3117, auto-increments if taken) and opens the browser. The review page shows:
- The eval prompt
- With-skill and baseline outputs
- Each rubric criterion with the agent's grade (win/tie/lose) and evidence
- Agree/disagree toggles and notes fields per criterion
- A general feedback textarea

Run this as a background task so you can continue the conversation. Tell the user the URL and ask them to review. When they click "Submit All Reviews," feedback saves directly to `feedback.json` via the server. Kill the server when the user is done.

### Static fallback

If the server fails to start (headless environment, port issues), fall back to static mode:

```bash
node <scripts>/generate-review.mjs \
  <workspace>/iteration-N \
  --skill-name "<name>" \
  --rubric <evals>/rubric.json \
  --output <workspace>/iteration-N/review.html
```

### Iteration comparison

For iteration 2+, add `--previous-workspace <workspace>/iteration-<N-1>`.

**Finding the scripts:** Both scripts (`generate-review.mjs`, `aggregate-benchmark.mjs`) are in the `scripts/` directory next to the skill-forge SKILL.md. Use the same base path you loaded this skill from. No Python or external dependencies required — just Node.js.
