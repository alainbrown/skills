---
name: skill-forge
description: >
  Creates and improves agent skills with proper plugin structure, READMEs, and eval-backed quality.
  Handles the full lifecycle: scaffolding the .claude-plugin folder, interviewing for the skill design,
  writing the SKILL.md, running evals with baselines, generating a skill README with findings, and
  cleaning up. Also re-evaluates and improves existing skills — reconstructs the rubric, runs fresh
  evals, compares against prior results, and iterates. Use this skill whenever the user wants to
  create a new skill, build a skill plugin, make a skill from scratch, set up a skills repo, improve
  an existing skill, re-evaluate a skill, or says things like "turn this into a skill", "I want to
  make a skill for X", "create a plugin", "package this as a skill", "improve this skill",
  "re-eval train", "this skill could be better", or "how is X holding up".
---

# Skill Forge

<purpose>
Build and improve agent skills that are structured, tested, and ready to share. Handles everything
from plugin scaffolding to eval-backed quality — producing skills users can install and immediately
benefit from. Also re-evaluates and iterates existing skills against fresh criteria.
</purpose>

<core_principle>
**Durable state via `.forge-state.json`.** This file survives context compression and ensures nothing
is lost over the long conversations that skill-forging involves.

- **Write after every significant change.** After any step completes, decision is made, or eval
  iteration finishes, update the state file.
- **Read before each step.** Before starting any step, read `.forge-state.json` to refresh context —
  especially important after context compression.
- **Clean up when done.** Delete `.forge-state.json` after the final commit.

Include: `skillName`, `skillDir`, `phase`, `iteration`, `pluginExists`, `repoReadmeExists`,
a `design` object (intent, trigger examples, confirmed status), an `evals` object (test cases,
last result, feedback), and a `decisions` object (key choices made, skipped steps). Adapt the
schema to the specific skill.
</core_principle>

## Workflow Overview

```
User wants to create a skill          User wants to improve a skill
       ↓                                        ↓
  ┌──────────────────────┐            ┌──────────────────────┐
  │ SCAFFOLD             │            │ ASSESS               │  Read skill, motivation, prior results
  └──────┬───────────────┘            └──────┬───────────────┘
         ↓                                   ↓
  ┌──────────────────────┐            ┌──────────────────────┐
  │ DESIGN               │            │ RECONSTRUCT RUBRIC   │  Reconstruct + revise eval criteria
  └──────┬───────────────┘            └──────┬───────────────┘
         ↓                                   ↓
  ┌──────────────────────┐                   │
  │ TEST & ITERATE       │◄──────────────────┘
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ DOCUMENT             │  Generate / update skill README
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ CLEAN UP             │  Workspace cleanup + optional commit
  └──────────────────────┘
```

<process>

<step name="route">
**Determine the workflow path.**

Evaluate user intent against these routing rules:

| If the user says... | Path | Entry step |
|---------------------|------|------------|
| "create a skill", "make a skill for X", "turn this into a skill", "build a plugin" | **Create** | `scaffold` |
| "improve this skill", "re-eval train", "this skill could be better", "how is X holding up" | **Re-eval** | `assess` |
| Ambiguous — could be either | Ask | — |

If ambiguous, use AskUserQuestion:
- header: "Which path?"
- question: "Are you creating a new skill or improving an existing one?"
- options:
  - "Create new" — scaffold a new skill from scratch
  - "Improve existing" — re-evaluate and iterate on an existing skill

### Mode selection

After determining the path, ask via AskUserQuestion:
- header: "Mode?"
- question: "How much control do you want over the process?"
- options:
  - "Interactive" — step-by-step, full questions, review at each checkpoint
  - "Auto" — use recommended defaults, propose once, confirm once

Store the mode in `.forge-state.json`. In auto mode: skip optional questions, use sensible
defaults, batch confirmations. In interactive mode: pause at every checkpoint, ask every
optional question, present alternatives.

▶ Next: `scaffold` (create) or `assess` (re-eval)
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- RE-EVAL PATH (existing skills only)        -->
<!-- ═══════════════════════════════════════════ -->

<step name="assess">
**Understand what needs improving.**

Read the existing SKILL.md, references, and README. Look for prior eval results in the README
(win rates, criteria, known gaps).

Ask via AskUserQuestion:
- header: "Motivation?"
- question: "What's motivating the re-eval?"
- options:
  - "New learnings" — behavior I've seen while using it
  - "Something's off" — specific behavior that needs fixing
  - "Periodic check" — just want to see how it's holding up
  - "Let me explain" — freeform description

The answer determines scope — targeted fix (one criterion) vs. broad re-evaluation (full rubric).

▶ Next: `reconstruct_rubric`
</step>

<step name="reconstruct_rubric">
**Rebuild the evaluation rubric from prior results.**

The `cleanup` step deletes eval artifacts, so prior rubrics won't exist on disk. Reconstruct
from the README:

1. **Find the criteria.** The README's "Where the skill adds value" and "Where the baseline holds up"
   sections describe what the skill was graded on, but in prose. Convert each distinct advantage or
   gap into a criterion with a name and description. Example: "baseline never security-hardens tools"
   becomes `{ "name": "security-hardening", "description": "Tools include path traversal protection,
   timeouts, size limits" }`. If no prior eval sections exist, derive criteria from the README's
   Features and Edge Cases sections, plus the SKILL.md content.

2. **Recover prior scores.** The README's eval results table has win/tie/loss counts per eval. Note
   the overall win rate and per-eval breakdown for comparison after the new run.

3. **Revise for this re-eval.** Keep criteria that still matter, add new ones based on the user's
   motivation (e.g., "reference-utilization" if testing structural changes), drop any that are no
   longer relevant.

4. **Save to `evals/rubric.json`** (schema in `references/eval-workflow.md`).

Share the updated rubric with the user before proceeding.

▶ Next: `create_tests`
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- CREATE PATH                                -->
<!-- ═══════════════════════════════════════════ -->

<step name="scaffold">
**Set up the plugin structure. Only create what's missing — never overwrite.**

### Plugin directory

Check if `.claude-plugin/` exists. If not, use AskUserQuestion:
- header: "Plugin setup"
- question: "This repo isn't set up as a skill plugin yet. Create the plugin structure?"
- options:
  - "Yes" — create .claude-plugin/ with marketplace metadata
  - "Skip" — I'll set it up later

If yes, create `.claude-plugin/marketplace.json`:

```json
{
  "name": "<owner>-<repo-name>",
  "owner": { "name": "<owner>" },
  "metadata": {
    "description": "<ask user for a one-line description>",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "<skill-name>",
      "description": "<skill description from SKILL.md frontmatter>",
      "source": "./",
      "skills": ["./skills/<skill-name>"]
    }
  ]
}
```

Try `git config user.name` for the owner and parse repo name from `git remote get-url origin`.
If not available, ask. If `marketplace.json` already exists, add a new plugin entry.

### Repo README

| State | Action |
|-------|--------|
| No README exists | Generate one: repo name, description, what skills are, install instructions, usage examples |
| README exists | Ask: "Want me to add skill install and usage instructions to your existing README?" |

### .gitignore

Check if `.gitignore` includes workspace directories. If not, suggest adding `*-workspace/` to
prevent eval workspaces from being committed.

▶ Next: `design`
</step>

<step name="design">
**Understand intent and draft the SKILL.md. This is the creative core.**

### Capture intent

Two entry points:

| Entry | Approach |
|-------|----------|
| "Turn this into a skill" | Extract from conversation context: tools used, step sequence, corrections made, I/O formats. Summarize and confirm before asking questions. |
| "I want to make a skill for X" | Starting from scratch. Ask questions to understand. |

Key questions (ask one at a time, not all at once):
1. What should this skill help the agent do?
2. When should it trigger? What would a user say?
3. What's the expected output or behavior?
4. Are there edge cases or things it should explicitly handle?

### Research

Before drafting, gather domain knowledge:

- **Similar skills in the repo:** Read other SKILL.md files for conventions, depth, and patterns.
- **MCP tools:** If context7 or similar docs tools are available, look up APIs and frameworks
  the skill references. Extract the patterns the skill needs to teach.
- **Conversation history:** For "turn this into a skill" requests, extract exact tool calls,
  decision points, corrections, and output formats.

Synthesize into concrete inputs for the SKILL.md: phases needed, user decisions, common edge
cases, output format.

### Propose structure

Before writing, present a structured proposal for the user to approve:

```
Proposed SKILL.md:
  Name:        <skill-name>
  Steps:       <step-1> → <step-2> → <step-3> → ...
  References:  <count> (<list of reference files and what each contains>)
  State file:  yes/no (<rationale>)
  Interactive:  yes/no
  Est. size:   ~<N> lines

Key decisions the skill will guide:
  1. <decision point 1>
  2. <decision point 2>
  ...
```

In auto mode, present and proceed unless the user objects. In interactive mode, wait for
explicit approval before writing.

### Write the SKILL.md

Create `skills/<skill-name>/SKILL.md`. Read `references/skill-writing.md` for detailed guidance
on frontmatter triggers, instruction density, anti-patterns, reference splitting, and phase
structure.

**Key principles:**
- Keep under 500 lines. Use `references/` for templates, schemas, and conditional content.
- Be rigid about things that must be correct (security, output formats, sequences).
- Be flexible about things that depend on context (naming, architecture, recommendations).
- Explain *why* things matter — the agent responds better to reasoning than commands.
- Structure with named steps that have clear entry conditions, substeps, and exit conditions.
- Include examples where behavior would be ambiguous without one.

### Durable state for multi-decision skills

| Condition | Add state file? |
|-----------|----------------|
| 3+ phases with user decisions, later phases depend on earlier ones | Yes |
| Short workflows or output files are the state | No |
| Primarily conversational (coaching, Q&A) | No |

If the pattern fits, add a section similar to this skill's own `.forge-state.json` — a JSON file
written after decisions, read before phases, cleaned up when done.

**Include a `context` field** for conversational nuance — intent, audience details, style
preferences, future considerations. Especially valuable when subagents consume the state file.

**Design the state as a subagent contract.** If the skill has a generation phase with subagents,
the state file is the only context those subagents receive. Every field a subagent needs must be
in the schema.

### Subagent strategy for generation phases

If the skill has a design phase (interactive) followed by a generation phase (producing artifacts),
consider subagents for generation. The design phase stays in the main conversation. The generation
phase delegates to subagents that receive only the state file + relevant references.

**Why:** By the time generation starts, the context window is full of interview conversation.
Subagents with clean, focused context produce more accurate output.

**Pattern:**
- Each subagent gets the state file + 1-2 relevant reference files
- Subagents run in parallel where outputs don't depend on each other
- Post-subagent verification stays in the main conversation

### Code-generating skills

If the skill generates code, separate stable from unstable knowledge in references:

| Stable (hardcode) | Unstable (delegate to LLM + docs) |
|---|---|
| Architecture patterns | API signatures and method names |
| Decision logic (when to use X vs Y) | Package versions |
| Tool/component shapes | Constructor arguments and config options |
| Security requirements | Model identifiers |
| Project structure | Framework-specific boilerplate |

**For unstable patterns:**
- Add "Known fragile patterns" sections to reference files
- Instruct the skill to suggest documentation tools (context7) — optional, not required
- If docs tools unavailable, flag uncertain patterns with `// TODO: verify`
- The skill must never require MCP to function — work well without, work better with

### Interactive browser UI

After capturing intent, consider whether the skill would benefit from browser-based interaction.
Ask the user. If yes, read `references/interactive-runtime.md` for the full setup pattern.

### Skill anatomy

```
skill-name/
├── SKILL.md          (required — the instructions)
├── README.md         (generated in document step)
├── scripts/          (optional — runtime files for browser interaction)
│   ├── interactive-server.mjs
│   └── shell.html
└── references/       (optional — docs loaded on demand)
    ├── some-guide.md
    └── another-ref.md
```

### Validate structure

After writing the SKILL.md, run a quick structural check:

| Check | Pass condition |
|-------|---------------|
| Frontmatter | Has `name` and `description` fields |
| Purpose | Contains `<purpose>` tag |
| Process | Contains `<process>` with at least one `<step name="...">` |
| Step naming | All steps have descriptive names (not `step_1`, `phase_2`) |
| Success criteria | Contains `<success_criteria>` with at least 3 items |
| Line count | Under 500 lines (excluding references) |
| References exist | Every referenced file in `references/` exists on disk |
| Guardrails | Contains `<guardrails>` if the skill has safety constraints |

If any check fails, fix it before proceeding. Report the results briefly:

```
Validation: 8/8 passed
  SKILL.md: 287 lines, 6 steps, 2 references
```

▶ Next: `define_criteria`
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- TEST & ITERATE (both paths converge here)  -->
<!-- ═══════════════════════════════════════════ -->

<step name="define_criteria">
**Define what "better" means for this skill.**

Ask via AskUserQuestion:
- header: "Success?"
- question: "What should this skill do better than the baseline? Pick the dimensions that matter."
- options:
  - "Fewer questions" — gets productive faster
  - "Consistent structure" — output follows a reliable format
  - "Edge case handling" — catches things the LLM would miss
  - "Connected output" — produces runnable code, not isolated snippets
  - "Conciseness" — no filler or congratulatory language
  - "Let me explain" — custom criteria

Draft 3-6 success criteria based on their answer. Save to `evals/rubric.json`
(schema in `references/eval-workflow.md`). Share with the user for review before proceeding.

**Skip this step for re-evals** — the rubric was already reconstructed in `reconstruct_rubric`.

▶ Next: `create_tests`
</step>

<step name="create_tests">
**Create realistic test cases.**

Come up with 2-4 realistic test prompts — things a real user would actually say. Include at
least one edge case. Share with the user for review. Save to `evals/evals.json`
(schema in `references/eval-workflow.md`).

If the skill has browser interaction, add 1-2 test cases for browser mode. See
`references/interactive-runtime.md` § "Interactive test cases" for additional rubric criteria
and eval prompt templates.

▶ Next: `run_evals`
</step>

<step name="run_evals">
**Run with-skill vs. baseline comparisons.**

For each test case, spawn two subagents in the same turn:

1. **With-skill run** — provide the skill path, save outputs to
   `<skill-name>-workspace/iteration-<N>/<eval-name>/with_skill/outputs/`
2. **Baseline run** — same prompt, no skill, save to `without_skill/outputs/`

For interactive test cases, see `references/interactive-runtime.md` § "Eval agent prompt template"
for the modified prompt.

▶ Next: `grade`
</step>

<step name="grade">
**Grade each output against the rubric.**

After all runs complete, read every output and grade each one independently. For each eval,
for each criterion, score both the with-skill and baseline outputs. Save `grading.json` per eval
(schema in `references/eval-workflow.md`).

▶ Next: `synthesize`
</step>

<step name="synthesize">
**Aggregate results and recommend next action.**

Build a summary table:

| Eval | Skill Wins | Baseline Wins | Ties |
|------|-----------|--------------|------|
| eval-1 | 4/5 | 0/5 | 1/5 |
| eval-2 | 3/5 | 1/5 | 1/5 |
| **Total** | **X/Y (Z%)** | ... | ... |

Answer the key question explicitly:

> "The skill wins Z% of criteria comparisons across N evals. The baseline already handles
> [these cases] well. The skill adds clear value for [these specific things]."

| Win Rate | Recommendation | Meaning |
|----------|---------------|---------|
| >70% and baseline loses on what matters | **Ship** | Skill provides clear value |
| Wins but has clear gaps, or marginal wins | **Iterate** | Gaps to fix before shipping |
| Doesn't meaningfully outperform baseline | **Reconsider** | LLM already does this well enough |

The threshold is a guideline, not a rule — the user may ship at 65% if gaps are all "baseline
caught up," or iterate at 80% if they see a specific weakness.

**For re-evals**, compare against prior README results:

> "Prior eval: 78% skill wins. This eval: 82%. Improved on [X]. Regressed on [Y]."

Present results and ask via AskUserQuestion:
- header: "Next?"
- question: "Results: Z%. Recommendation: [ship/iterate/reconsider]. How to proceed?"
- options:
  - "Iterate" — diagnose and fix the gaps
  - "Ship" — good enough, move to documentation
  - "Let me explain" — specific feedback

### Review viewer

After grading, launch the review viewer — shows outputs side-by-side with rubric grades.
See `references/eval-workflow.md` § "Review Viewer" for CLI invocation, static fallback,
and iteration comparison flags. Run as a background task so the conversation continues.

▶ Next: `iterate` (if iterate) or `document` (if ship)
</step>

<step name="iterate">
**Diagnose gaps and improve the skill.**

This step activates when the recommendation is "iterate" or the user says to improve.
Flow directly from synthesis into diagnosis — don't wait for the user to ask.

**1. Diagnose.** For each criterion the skill tied or lost on, re-read both outputs side by side:
- What did the baseline do that matched or beat the skill?
- What did the skill's output miss?
- Which section of SKILL.md or reference file would have changed the outcome?

**2. Categorize.** Each gap falls into one bucket:

| Category | Example | Fix |
|----------|---------|-----|
| Missing instruction | Skill doesn't tell agent to check for X | Add instruction to SKILL.md |
| Unclear guidance | Agent misinterpreted the instruction | Rewrite with example or specificity |
| Reference gap | Template missing a needed pattern | Update reference file |
| Structural issue | Step buried in long section | Extract to reference or restructure |
| Baseline caught up | LLM now does this well without guidance | Not fixable — accept the tie |

**3. Propose.** Draft specific edits: quote current text, show proposed replacement, explain why.
Group by file.

**4. Present.** Show everything in one message: results table, diagnosis, categorized gaps,
proposed edits. Ask for confirmation before applying.

**5. Apply and rerun.** Make edits, rerun evals (`run_evals` → `grade` → `synthesize`), compare
against both the prior iteration and the original baseline. If still "iterate," repeat
automatically — diagnose, propose, present, apply. Continue until "ship," all remaining gaps
are "baseline caught up," or the user says stop.

▶ Next: `document` (when shipping) or `run_evals` (when iterating)
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- FINALIZE                                   -->
<!-- ═══════════════════════════════════════════ -->

<step name="document">
**Generate the skill README.**

Create `skills/<skill-name>/README.md` with these sections:

**Always include:**
- Title and one-line description (from SKILL.md frontmatter)
- Usage (example prompts that trigger the skill)
- What it does (expanded description)
- Features (from SKILL.md section headers — each major capability becomes a bullet)

**Include if available:**
- Safety (if the skill has safety checks or guardrails)
- Edge cases handled (if explicitly handled)

**Include if evals were run:**
- Test scenarios (from evals.json — prompt + description)
- Eval results (win rate — overall and per-eval breakdown)
- Where the baseline holds up / Where the skill adds value (from criteria-level analysis)

Ask via AskUserQuestion:
- header: "Decisions?"
- question: "Any design decisions worth documenting? Tradeoffs, approach choices, etc."
- options:
  - "Yes" — let me describe them
  - "No" — skip this section

▶ Next: `cleanup`
</step>

<step name="cleanup">
**Remove eval artifacts and commit.**

### Workspace

```bash
du -sh <skill-name>-workspace/
```

Use AskUserQuestion:
- header: "Workspace"
- question: "The eval workspace is <size>. Keep or delete?"
- options:
  - "Delete" — remove it
  - "Keep" — keep for reference (ensure *-workspace/ is in .gitignore)

### Eval artifacts

Delete `skills/<skill-name>/evals/`. The eval results are captured in the README — raw files
don't need to ship.

### Commit

Use AskUserQuestion:
- header: "Commit?"
- question: "Ready to commit? I'll stage just the skill files — SKILL.md, README.md, and references."
- options:
  - "Yes" — commit with a descriptive message
  - "Not yet" — I'll commit later
</step>

</process>

<guardrails>
- NEVER overwrite existing files during scaffold — only create what's missing
- NEVER skip user confirmation before applying iteration edits
- NEVER ship eval artifacts (evals/, *-workspace/) in the final commit
- NEVER require MCP tools for a skill to function — optional enhancement only
- If the skill has browser interaction, runtime files must be self-contained copies
- The `.forge-state.json` file MUST be deleted after the final commit
- Ask one question at a time during design — do not overwhelm with multiple questions
- Adapt to the user — if they want to skip evals and just vibe, that's fine
- Explain jargon briefly when first used: "eval" → "a test run," "rubric" → "grading checklist"
- The steps are a guide, not a mandate — don't let process get in the way of creativity
</guardrails>

<success_criteria>
- [ ] Plugin structure exists (.claude-plugin/marketplace.json) or user explicitly skipped
- [ ] SKILL.md written with proper frontmatter triggers and structured steps
- [ ] Eval rubric defined and reviewed by user
- [ ] Test cases created (2-4 realistic prompts including edge cases)
- [ ] Evals run: with-skill vs. baseline comparisons complete
- [ ] Results synthesized with clear ship/iterate/reconsider recommendation
- [ ] Iteration applied if needed — gaps diagnosed, fixes proposed, evals rerun
- [ ] README generated with eval results and feature documentation
- [ ] Eval workspace and artifacts cleaned up
- [ ] Skill files committed to git
- [ ] `.forge-state.json` deleted
</success_criteria>
