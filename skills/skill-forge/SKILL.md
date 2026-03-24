---
name: skill-forge
description: >
  Creates publishable agent skills with proper plugin structure, READMEs, and eval-backed quality.
  Handles the full lifecycle: scaffolding the .claude-plugin folder, interviewing for the skill design,
  writing the SKILL.md, running evals with baselines, generating a skill README with findings, and
  cleaning up. Use this skill whenever the user wants to create a new skill, build a skill plugin,
  make a skill from scratch, set up a skills repo, or says things like "turn this into a skill",
  "I want to make a skill for X", "create a plugin", or "package this as a skill".
---

# Skill Forge — Build Publishable Agent Skills

You help users create agent skills that are structured, tested, and ready to share. You handle everything from plugin scaffolding to eval-backed READMEs.

## Forge State

Persist progress to `.forge-state.json` in the working directory. This file is the durable source of truth — it survives context compression and ensures nothing is lost over the long conversations that skill-forging typically involves.

**Write after every significant change.** After any phase completes, decision is made, or eval iteration finishes, update the state:

```json
{
  "skillName": "user-journey",
  "skillDir": "skills/user-journey",
  "phase": "test",
  "iteration": 2,
  "pluginExists": true,
  "repoReadmeExists": true,
  "design": {
    "intent": "Generate Playwright E2E test specs for user journeys",
    "triggerExamples": ["write E2E tests", "test the login flow"],
    "confirmedByUser": true
  },
  "evals": {
    "testCases": ["login-flow", "ecommerce-checkout", "signup-onboarding"],
    "lastIterationResult": "iterate",
    "feedback": "needs negative assertions for conditional flows"
  },
  "decisions": {
    "suiteStructure": "spec-only unless 3+ pages",
    "locatorStrategy": "role-based first, data-testid fallback",
    "skippedPhases": []
  }
}
```

**Read before each phase.** Before starting any phase, read `.forge-state.json` to refresh your understanding. This is especially important after long conversations where context compression may have dropped earlier details.

**Clean up when done.** Delete `.forge-state.json` after the final commit — it's served its purpose.

---

## Workflow Overview

```
User wants to create a skill
       ↓
  ┌──────────────────────┐
  │ 1. SCAFFOLD          │  Plugin structure + repo README
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 2. DESIGN            │  Interview, research, draft SKILL.md
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 3. TEST & ITERATE    │  Eval loop (test → review → improve)
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 4. DOCUMENT          │  Generate skill README from findings
  └──────┬───────────────┘
         ↓
  ┌──────────────────────┐
  │ 5. CLEAN UP          │  Workspace cleanup + optional commit
  └──────────────────────┘
```

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

**If no README exists**, generate one from this template:

```markdown
# <repo-name>

<description>

## What are skills?

Skills are markdown instruction files (SKILL.md) that AI coding agents load
when they recognize a relevant task. Think of them as playbooks — structured
workflows that give your agent tested expertise instead of improvising from
scratch.

Skills work with AI coding agents that support them, including Claude Code,
Gemini CLI, OpenAI Codex, and other agents with skill/plugin support.

## Usage

After installing, just talk to your agent naturally. Skills trigger
automatically when your request matches what they do. You can also
invoke a skill directly by name (e.g., `/skill-name`).

## How skills work

1. Each skill's name and description are loaded into your agent's context
2. When you send a message, your agent checks if any skill matches
3. If matched, the full SKILL.md is loaded and the agent follows it
4. Skills guide the agent through a structured workflow — they don't
   replace its judgment, they focus it
```

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

Check available tools for research — MCP servers, documentation, similar skills in the repo. Come prepared with context to reduce burden on the user.

### Write the SKILL.md

Create `skills/<skill-name>/SKILL.md` with:

**Frontmatter:**
```yaml
---
name: <skill-name>
description: >
  <what it does and when to trigger — be specific and slightly "pushy"
  about trigger conditions to combat under-triggering>
---
```

**Body guidelines:**
- Keep under 500 lines. If approaching the limit, use reference files in a `references/` subdirectory.
- Use imperative form in instructions.
- Explain *why* things matter instead of rigid MUST/NEVER rules — the agent is smart and responds better to reasoning than commands.
- Include examples where they help.
- Structure with clear phases or steps so the agent has a workflow to follow.

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

### Skill anatomy

```
skill-name/
├── SKILL.md          (required — the instructions)
├── README.md         (generated in Phase 4)
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

Save these to `evals/rubric.json`:

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

### Create test cases

Come up with 2-4 realistic test prompts — things a real user would actually say. Include at least one edge case. Share them with the user for review. Save to `evals/evals.json` in the skill directory:

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

### Run tests

For each test case, spawn two subagents in the same turn:

1. **With-skill run** — provide the skill path, save outputs to `<skill-name>-workspace/iteration-<N>/<eval-name>/with_skill/outputs/`
2. **Baseline run** — same prompt, no skill, save to `without_skill/outputs/`

### Grade against the rubric

After all runs complete, read every output and grade each one independently against the rubric. For each eval, for each criterion, score both the with-skill and baseline outputs.

Save `grading.json` per eval:

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

Present this to the user. If they want to iterate, identify which criteria the skill lost on and improve the SKILL.md to address those gaps. Rerun.

### Launch the review viewer

After grading, always launch the interactive review server. It shows outputs side-by-side with rubric grades and lets the user agree/disagree per criterion with inline notes.

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

If the server fails to start (headless environment, port issues), fall back to static mode:
```bash
node <scripts>/generate-review.mjs \
  <workspace>/iteration-N \
  --skill-name "<name>" \
  --rubric <evals>/rubric.json \
  --output <workspace>/iteration-N/review.html
```

For iteration 2+, add `--previous-workspace <workspace>/iteration-<N-1>`.

**Finding the scripts:** Both scripts are in the `scripts/` directory next to this SKILL.md. Use the same base path you loaded this skill from. No Python or external dependencies required — just Node.js.

### Iterate

If the recommendation is "iterate," improve the SKILL.md to address the criteria it lost on. Rerun the evals. Repeat until the user is satisfied or the skill clearly wins on the criteria that matter.

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
