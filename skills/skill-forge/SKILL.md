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

# Skill Forge — Build Publishable Agent Skills

You help users create agent skills that are structured, tested, and ready to share. You handle everything from plugin scaffolding to eval-backed READMEs.

## Forge State

Persist progress to `.forge-state.json` in the working directory. This file is the durable source of truth — it survives context compression and ensures nothing is lost over the long conversations that skill-forging typically involves.

**Write after every significant change.** After any phase completes, decision is made, or eval iteration finishes, update the state. Include: `skillName`, `skillDir`, `phase`, `iteration`, `pluginExists`, `repoReadmeExists`, a `design` object (intent, trigger examples, confirmed status), an `evals` object (test cases, last result, feedback), and a `decisions` object (key choices made, skipped phases). Adapt the schema to the specific skill.

**Read before each phase.** Before starting any phase, read `.forge-state.json` to refresh your understanding — especially important after context compression.

**Clean up when done.** Delete `.forge-state.json` after the final commit — it's served its purpose.

---

## Workflow Overview

```
User wants to create a skill          User wants to improve a skill
       ↓                                        ↓
  ┌──────────────────────┐            ┌──────────────────────┐
  │ 1. SCAFFOLD          │            │ RE-EVAL: ASSESS      │  Read skill, motivation, prior results
  └──────┬───────────────┘            └──────┬───────────────┘
         ↓                                   ↓
  ┌──────────────────────┐            ┌──────────────────────┐
  │ 2. DESIGN            │            │ RE-EVAL: RUBRIC      │  Reconstruct + revise eval criteria
  └──────┬───────────────┘            └──────┬───────────────┘
         ↓                                   ↓
  ┌──────────────────────┐                   │
  │ 3. TEST & ITERATE    │◄─────────────────-┘
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 4. DOCUMENT          │  Generate / update skill README
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 5. CLEAN UP          │  Workspace cleanup + optional commit
  └──────────────────────┘
```

---

## Re-evaluating an Existing Skill

When the user wants to improve a skill rather than create one — "improve scaffold", "re-eval train", "this skill could be better" — use this flow instead of Phases 1–2.

### Assess

Read the existing SKILL.md, references, and README. Look for prior eval results in the README (win rates, criteria, known gaps). Ask:

> "What's motivating the re-eval? New learnings from using it, behavior that's off, or just a periodic check?"

The answer determines scope — targeted fix (one criterion) vs. broad re-evaluation (full rubric).

### Reconstruct the rubric

Phase 5 deletes eval artifacts, so prior rubrics won't exist on disk. Reconstruct from the README:

1. **Find the criteria.** The README's "Where the skill adds value" and "Where the baseline holds up" sections describe what the skill was graded on, but in prose — not as named criteria. Convert each distinct advantage or gap into a criterion with a name and description. For example, "baseline never security-hardens tools" becomes `{ "name": "security-hardening", "description": "Tools include path traversal protection, timeouts, size limits" }`. If no prior eval sections exist, derive criteria from the README's Features and Edge Cases sections, plus the SKILL.md content.
2. **Recover prior scores.** The README's eval results table has win/tie/loss counts per eval. Note the overall win rate and per-eval breakdown so you can compare after the new run.
3. **Revise for this re-eval.** Keep criteria that still matter, add new ones based on the user's motivation (e.g., "reference-utilization" if testing structural changes), drop any that are no longer relevant.
4. **Save to `evals/rubric.json`** (schema in `references/eval-workflow.md`).

Share the updated rubric with the user before proceeding.

### Enter Phase 3

Run evals as normal (Phase 3). After grading, compare against the prior README results:

> "Prior eval: 78% skill wins. This eval: 82%. Improved on [X]. Regressed on [Y]. New criteria [Z] scores well."

If the README has no prior results, treat this as a first eval — no comparison, just baseline.

### Finish

After iteration stabilizes, update the README with fresh results (Phase 4) and clean up (Phase 5).

---

## Phase 1: Scaffold

Before creating a skill, make sure the repo is set up as a plugin. Check for existing structure and only create what's missing — never overwrite.

### Plugin structure

Check if `.claude-plugin/` exists. If not:

> "This repo isn't set up as a skill plugin yet. Want me to create the plugin structure? I'll add a `.claude-plugin/` folder with the marketplace metadata needed to make your skills installable."

If the user agrees, create:

```
.claude-plugin/
└── marketplace.json
```

Try `git config user.name` for the owner and parse the repo name from `git remote get-url origin`. If not available, ask.

**marketplace.json:**

```json
{
  "name": "<owner>-<repo-name>",
  "owner": {
    "name": "<owner>"
  },
  "metadata": {
    "description": "<ask user for a one-line description>",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "<skill-name>",
      "description": "<skill description from SKILL.md frontmatter>",
      "source": "./",
      "skills": [
        "./skills/<skill-name>"
      ]
    }
  ]
}
```

Each skill gets its own entry in the `plugins` array. If `marketplace.json` already exists, add a new plugin entry for the new skill rather than overwriting.

### Repo README

Check if a `README.md` exists at the repo root.

**If no README exists**, generate one with: repo name, description, what skills are (markdown instruction files for AI coding agents), install instructions, usage examples, and how skills work (loaded into context, matched to requests, guide the agent).

**If a README already exists**, ask:

> "Your repo already has a README. Want me to add skill install and usage instructions to it?"

If yes, append a section with the install/usage block. If no, skip.

### .gitignore

Check if `.gitignore` exists and whether it includes workspace directories. If not, suggest adding:

```
*-workspace/
```

This prevents eval workspaces from being committed accidentally.

---

## Phase 2: Design the Skill

This is the creative core — understand what the user wants and draft the SKILL.md.

### Capture intent

Start by understanding what the user wants. There are two common entry points:

**"Turn this into a skill"** — The current conversation already contains a workflow. Extract what you can from context before asking questions: the tools used, the sequence of steps, corrections the user made, input/output formats observed. Summarize what you extracted and confirm with the user before proceeding. This saves them from re-explaining what they just did.

**"I want to make a skill for X"** — Starting from scratch. Ask questions to understand the intent.

Key questions (ask one at a time, not all at once):

1. What should this skill help the agent do?
2. When should it trigger? What would a user say?
3. What's the expected output or behavior?
4. Are there edge cases or things it should explicitly handle?

### Research

Before drafting, gather domain knowledge so you're not relying solely on the user to explain everything.

- **Similar skills in the repo:** Read other skills' SKILL.md files to understand the conventions, depth, and patterns already in use. Note what works and borrow structural patterns.
- **MCP tools:** If context7 or similar documentation tools are available, look up APIs, libraries, or frameworks the skill will reference. Extract the patterns the skill needs to teach — don't just note that docs exist.
- **The user's conversation history:** If this is a "turn this into a skill" request, the conversation itself is the richest source. Extract the exact tool calls, decision points, corrections, and output formats observed.

Synthesize research into concrete inputs for the SKILL.md: which phases does the skill need, what decisions does the user make, what are the common edge cases, what output format works.

### Write the SKILL.md

Create `skills/<skill-name>/SKILL.md`. Read `references/skill-writing.md` for detailed guidance on frontmatter trigger descriptions, instruction density (rigid vs. flexible), common anti-patterns, when to split content into references, and how to structure phases.

**Frontmatter:**
```yaml
---
name: <skill-name>
description: >
  <what it does and when to trigger — be specific and slightly "pushy"
  about trigger conditions to combat under-triggering>
---
```

**Key principles:**
- Keep under 500 lines. Use reference files in a `references/` subdirectory for templates, schemas, and conditional content.
- Be rigid about things that must be correct (security, output formats, sequences). Be flexible about things that depend on context (naming, architecture, recommendations).
- Explain *why* things matter — the agent responds better to reasoning than commands.
- Structure with named phases that have clear entry conditions, substeps, and exit conditions.
- Include examples where behavior would be ambiguous without one.

### Durable state for multi-decision skills

If the skill you're designing involves a multi-phase workflow where the user makes decisions that build on each other (like picking a tech stack, configuring options, or iterating on a design), add a durable state file pattern. This protects against context compression losing earlier decisions in long conversations.

**When to add it:**
- The skill has 3+ phases with user decisions
- Later phases depend on earlier decisions
- Conversations are expected to be long enough for context compression

**When to skip it:**
- Short workflows (a few exchanges)
- The output files themselves are the state (e.g., generated code, test specs)
- The skill is primarily conversational (coaching, Q&A)

If the pattern fits, add a section similar to this skill's own "Forge State" — a JSON file written after decisions, read before phases, cleaned up when done. Adapt the schema to the skill's specific decisions.

**Add a `context` field for conversational nuance.** Alongside structured decision fields, include a free-form `context` object that captures things the user said that don't fit the schema — intent, audience details, style preferences, future considerations. This is especially valuable when subagents consume the state file and need tonal or contextual awareness beyond the rigid fields.

**Design the state as a subagent contract.** If the skill has a generation phase that uses subagents (see below), the state file is the only context those subagents receive. Every field a subagent needs must be in the schema — don't assume subagents can infer from conversation history.

### Subagent strategy for generation phases

If the skill has a design phase (interactive, conversational) followed by a generation phase (producing code, files, or artifacts), consider using subagents for the generation phase. The design phase stays in the main conversation where back-and-forth is natural. The generation phase delegates to subagents that receive only the state file + relevant reference files — no conversation history.

**Why this helps:** By the time generation starts, the context window is full of interview conversation — tentative ideas, rejected options, corrections. Subagents with clean, focused context produce more accurate output than the main conversation generating code inline.

**Pattern:**
- Each subagent gets the state file + 1-2 relevant reference files
- Subagents run in parallel where their outputs don't depend on each other
- Post-subagent verification stays in the main conversation (install, compile check, summary)

### Guidance for code-generating skills

If the skill being designed generates code (scaffolds projects, writes implementations, produces config files), the reference files need special attention. Library APIs change frequently — hardcoding exact code in references creates fragile skills that break when dependencies update.

**Separate stable from unstable knowledge in references:**

| Stable (hardcode) | Unstable (delegate to LLM + docs) |
|---|---|
| Architecture patterns | API signatures and method names |
| Decision logic (when to use X vs Y) | Package versions |
| Tool/component shapes (name, schema, what it does) | Constructor arguments and config options |
| Security requirements (timeouts, path validation) | Model identifiers |
| Project structure (directory layouts) | Framework-specific boilerplate |

**For unstable patterns, add verification gates:**
- Add "Known fragile patterns" sections to reference files listing which patterns change between library versions
- Instruct the skill to suggest documentation tools (context7) at the start — "For the most accurate output, you can add context7. It's optional."
- If docs tools are unavailable, flag uncertain patterns with `// TODO: verify` comments instead of guessing
- The skill should never require MCP to function — it should work well without it and work better with it

### Interactive browser UI pattern

After capturing intent, consider whether the skill would benefit from browser-based interaction (quizzes, forms, visual feedback, timers, drag-and-drop). Ask the user. If yes, read `references/interactive-runtime.md` for the full setup pattern — runtime files to copy, reference docs to generate, and how the server works.

### Skill anatomy

```
skill-name/
├── SKILL.md          (required — the instructions)
├── README.md         (generated in Phase 4)
├── scripts/          (optional — runtime files for browser interaction)
│   ├── interactive-server.mjs
│   └── shell.html
└── references/       (optional — docs loaded on demand)
    ├── some-guide.md
    └── another-ref.md
```

---

## Phase 3: Test & Iterate

After the draft, test it. The goal is to answer one question: **does this skill produce better outcomes than the LLM alone?**

### Define success criteria

Before writing test cases, define what "better" means for this specific skill. Ask the user:

> "What should this skill do better than the baseline? For example: fewer questions before being productive, more consistent output structure, handles edge cases the LLM would miss, etc."

Draft 3-6 success criteria — concrete, evaluable dimensions. Examples:

- "Asks fewer clarifying questions before producing output"
- "Output follows a consistent structure across different inputs"
- "Handles [specific edge case] that the baseline would miss"
- "Produces connected, runnable output (not isolated snippets)"
- "Stays concise — no filler or congratulatory language"

Save to `evals/rubric.json` (schema in `references/eval-workflow.md`). Share with the user for review before proceeding.

### Create test cases

Come up with 2-4 realistic test prompts — things a real user would actually say. Include at least one edge case. Share them with the user for review. Save to `evals/evals.json` (schema in `references/eval-workflow.md`).

### Add interactive test cases (if applicable)

If the skill has browser interaction, add 1-2 test cases for browser mode. See `references/interactive-runtime.md` § "Interactive test cases" for the additional rubric criteria and eval prompt templates.

### Run tests

For each test case, spawn two subagents in the same turn:

1. **With-skill run** — provide the skill path, save outputs to `<skill-name>-workspace/iteration-<N>/<eval-name>/with_skill/outputs/`
2. **Baseline run** — same prompt, no skill, save to `without_skill/outputs/`

For interactive test cases, see `references/interactive-runtime.md` § "Eval agent prompt template" for the modified prompt.

### Grade against the rubric

After all runs complete, read every output and grade each one independently against the rubric. For each eval, for each criterion, score both the with-skill and baseline outputs. Save `grading.json` per eval (schema in `references/eval-workflow.md`).

### Synthesize results

After grading all evals, aggregate the results into a summary table:

| Eval | Skill Wins | Baseline Wins | Ties |
|------|-----------|--------------|------|
| eval-1 | 4/5 | 0/5 | 1/5 |
| eval-2 | 3/5 | 1/5 | 1/5 |
| **Total** | **X/Y (Z%)** | ... | ... |

Then answer the key question explicitly:

> "The skill wins Z% of criteria comparisons across N evals. The baseline already handles [these cases] well. The skill adds clear value for [these specific things]. **Recommendation: ship / iterate / reconsider.**"

- **Ship** — skill wins >70% of criteria and the baseline loses on things that matter
- **Iterate** — skill wins but has clear gaps to fix, or wins are marginal
- **Reconsider** — skill doesn't meaningfully outperform the baseline; the LLM already does this well enough

**After presenting results, ask the user how to proceed.** The threshold is a guideline, not a rule — the user may ship at 65% if the gaps are all "baseline caught up," or iterate at 80% if they see a specific weakness.

> "Results: Z%. Recommendation: [ship/iterate/reconsider]. I've identified N gaps — want me to diagnose and propose edits, or is this good enough to ship?"

**If they say iterate (or "proceed", "improve it", "keep going"):** continue directly into diagnosis and proposed improvements. Deliver results + diagnosis + proposed edits, then pause for confirmation before applying.

**If they say ship (or "that's fine", "good enough", "stop"):** move to Phase 4 (Document) and Phase 5 (Clean Up).

### Launch the review viewer

After grading, launch the review viewer — it shows outputs side-by-side with rubric grades and lets the user agree/disagree per criterion. See `references/eval-workflow.md` § "Review Viewer" for CLI invocation, static fallback, and iteration comparison flags.

### Iterate

When the recommendation is "iterate," flow directly from synthesis into diagnosis. Don't wait for the user to ask — they already told you to improve the skill.

**Step 1: Diagnose.** For each criterion the skill tied or lost on, re-read the with-skill and baseline outputs side by side. Answer:
- What did the baseline do that matched or beat the skill?
- What did the skill's output miss — a step it skipped, guidance it ignored, or a pattern it got wrong?
- Is there a specific section of the SKILL.md or a reference file where better instructions would have changed the outcome?

**Step 2: Categorize.** Each gap falls into one of these buckets:

| Category | Example | Fix |
|----------|---------|-----|
| Missing instruction | Skill doesn't tell agent to check for X | Add the instruction to SKILL.md |
| Unclear guidance | Agent read the instruction but interpreted it wrong | Rewrite with an example or more specificity |
| Reference gap | Template is missing a pattern the agent needed | Update the reference file |
| Structural issue | Agent missed a step because it's buried in a long section | Extract to a reference or restructure the phase |
| Baseline caught up | LLM now does this well without guidance | Not fixable — consider dropping the criterion or accepting the tie |

**Step 3: Propose.** Draft specific edits — quote the current text, show the proposed replacement, explain why. Group by file (SKILL.md vs. specific references).

**Step 4: Present the full package.** Show the user everything in one message: results table, diagnosis, categorized gaps, and proposed edits. Ask for confirmation or adjustments before applying.

**Step 5: Apply and rerun.** Make the edits, rerun the evals, compare against both the prior iteration and the original baseline. If the result is still "iterate," repeat the cycle automatically — diagnose, propose, present, apply. Continue until the result is "ship," the remaining gaps are all "baseline caught up," or the user says to stop.

---

## Phase 4: Document

After the eval loop stabilizes, generate a README for the skill.

### Generate skill README

Create `skills/<skill-name>/README.md` with these sections:

**Always include:**
- **Title and one-line description** (from SKILL.md frontmatter)
- **Usage** (example prompts that trigger the skill, from evals or conversation)
- **What it does** (expanded description)
- **Features** (extracted from SKILL.md section headers — each major phase or capability becomes a bullet)

**Include if available:**
- **Safety** (if the skill has safety checks, warnings, or guardrails)
- **Edge cases handled** (if the skill explicitly handles edge cases)

**Include if evals were run:**
- **Test scenarios** (from evals.json — prompt + description for each)
- **Eval results** (skill win rate from rubric grading — overall percentage and per-eval breakdown)
- **Where the baseline holds up / Where the skill adds value** (from criteria-level analysis)

**Ask at the end:**
> "Any design decisions worth documenting in the README? For example, why you chose a particular approach, or tradeoffs you considered."

If the user provides design decisions, add a **Design decisions** section.

---

## Phase 5: Clean Up

### Workspace cleanup

After everything is done, check the workspace size and ask:

```bash
du -sh <skill-name>-workspace/
```

> "The eval workspace at `<path>` is <size>. Want to keep it for reference or delete it?"

If delete, remove it. If keep, make sure `*-workspace/` is in `.gitignore`.

### Eval artifacts cleanup

Also delete the `evals/` directory inside the skill folder (`skills/<skill-name>/evals/`). The eval test cases and metadata were used during development and aren't part of the published skill. The eval results are already captured in the README — the raw files don't need to ship.

### Optional commit

Offer to commit the skill files:

> "Ready to commit? I'll stage just the skill files — SKILL.md, README.md, and any references. Not the workspace or evals."

If they agree, stage only the skill directory contents (not the workspace or evals) and commit with a descriptive message.

---

## Tone

You're a collaborator, not a bureaucrat. The scaffolding and structure exist to make the skill publishable and professional, but don't let process get in the way of creativity. If the user wants to skip evals and just vibe, that's fine — adapt. The phases are a guide, not a mandate.

For users unfamiliar with coding jargon, explain terms briefly when first used. "Assertions" → "checks that verify the skill did what we expected." "Eval" → "a test run." Match their level.
