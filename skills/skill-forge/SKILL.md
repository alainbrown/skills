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

> "This repo isn't set up as a skill plugin yet. Want me to create the plugin structure? I'll add a `.claude-plugin/` folder with the metadata files needed to make your skills installable."

If the user agrees, create:

```
.claude-plugin/
├── plugin.json
└── marketplace.json
```

**plugin.json** — populate from git config and repo name:

```json
{
  "name": "<repo-name>",
  "description": "<ask user for a one-line description>",
  "version": "1.0.0",
  "license": "MIT",
  "keywords": []
}
```

Try `git config user.name` for the owner and parse the repo name from `git remote get-url origin`. If not available, ask.

**marketplace.json:**

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "<owner>-<repo-name>",
  "description": "<same as plugin.json>",
  "owner": {
    "name": "<owner>"
  },
  "plugins": [
    {
      "name": "<repo-name>",
      "description": "<same>",
      "source": "./"
    }
  ]
}
```

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

## Install

**Claude Code:**
\`\`\`bash
/plugin marketplace add <owner>/<repo-name>
\`\`\`

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

Fill in `<owner>`, `<repo-name>`, and `<description>` from the plugin metadata.

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

After the draft, test it. This follows the standard eval loop.

### Create test cases

Come up with 2-4 realistic test prompts — things a real user would actually say. Share them with the user for review. Save to `evals/evals.json` in the skill directory:

```json
{
  "skill_name": "<name>",
  "evals": [
    {
      "id": 1,
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

Create `eval_metadata.json` for each test case with a descriptive name and assertions (can be empty initially).

### Draft assertions

While runs are in progress, draft quantitative assertions — objectively verifiable checks with descriptive names. Not every skill needs these. Skills with subjective outputs (writing style, creative work) are better evaluated qualitatively.

Ask the user: "Should we set up quantitative assertions for these tests, or is qualitative review enough for this skill?"

If they want assertions, draft them and save to the eval_metadata.json files.

### Capture timing

When each subagent completes, save `total_tokens` and `duration_ms` from the notification to `timing.json` immediately — this data isn't persisted elsewhere.

### Grade and review

After all runs complete:

1. **Grade each run** against assertions (if any). Save `grading.json` using the schema: `expectations` array with `text`, `passed`, `evidence` fields.

2. **Build benchmark** — aggregate results into `benchmark.json`:
   ```bash
   node <scripts>/aggregate-benchmark.mjs \
     <workspace>/iteration-N --skill-name "<name>"
   ```

3. **Launch the eval viewer** — start the review server in the background:
   ```bash
   node <scripts>/generate-review.mjs \
     <workspace>/iteration-N \
     --skill-name "<name>" \
     --benchmark <workspace>/iteration-N/benchmark.json
   ```
   This starts a local server (default port 3117, auto-increments if taken) and opens the browser. The user reviews outputs, types feedback, and clicks "Submit All Reviews" — feedback saves directly to `<workspace>/iteration-N/feedback.json` via the server. No file downloads needed.

   Run this as a background task so you can continue the conversation. Kill the server when the user is done reviewing.

   For iteration 2+, add `--previous-workspace <workspace>/iteration-<N-1>`.

   For headless environments (CI, Cowork), use static mode instead:
   ```bash
   node <scripts>/generate-review.mjs \
     <workspace>/iteration-N \
     --skill-name "<name>" \
     --output <workspace>/iteration-N/review.html
   ```

   **Finding the scripts:** Both scripts are in the `scripts/` directory next to this SKILL.md. Use the same base path you loaded this skill from — the scripts are always at `scripts/aggregate-benchmark.mjs` and `scripts/generate-review.mjs` relative to it. No Python or external dependencies required — just Node.js.

4. **Tell the user** to review the outputs and come back with feedback.

### Iterate

Read feedback. Improve the skill. Rerun. Repeat until the user is happy or all feedback is empty.

---

## Phase 4: Document

After the eval loop stabilizes, generate a README for the skill.

### Generate skill README

Create `skills/<skill-name>/README.md` with these sections:

**Always include:**
- **Title and one-line description** (from SKILL.md frontmatter)
- **Install** (templated from plugin metadata)
- **Usage** (example prompts that trigger the skill, from evals or conversation)
- **What it does** (expanded description)
- **Features** (extracted from SKILL.md section headers — each major phase or capability becomes a bullet)

**Include if available:**
- **Safety** (if the skill has safety checks, warnings, or guardrails)
- **Edge cases handled** (if the skill explicitly handles edge cases)

**Include only if quantitative assertions were run:**
- **Test scenarios** (from evals.json — prompt + description for each)
- **Eval results** (from benchmark.json — pass rates, baseline comparison table)
- **Where the baseline holds up / Where the skill adds value** (analysis from grading)

If the skill was evaluated qualitatively only (no assertions, no grading), skip the eval results section entirely. Don't fabricate numbers or force quantitative framing onto subjective skills.

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

### Optional commit

Offer to commit the skill files:

> "Ready to commit? I'll stage just the skill files — SKILL.md, README.md, and any references. Not the workspace."

If they agree, stage only the skill directory contents (not the workspace) and commit with a descriptive message.

---

## Tone

You're a collaborator, not a bureaucrat. The scaffolding and structure exist to make the skill publishable and professional, but don't let process get in the way of creativity. If the user wants to skip evals and just vibe, that's fine — adapt. The phases are a guide, not a mandate.

For users unfamiliar with coding jargon, explain terms briefly when first used. "Assertions" → "checks that verify the skill did what we expected." "Eval" → "a test run." Match their level.
