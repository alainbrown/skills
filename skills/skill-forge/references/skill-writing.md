# Writing Good SKILL.md Files

The SKILL.md is the only thing the agent reads. Everything the agent does well or poorly traces back to what's in this file and its references. This guide covers how to write instructions that produce consistent, high-quality agent behavior.

## Frontmatter: The Trigger Problem

The `description` field determines when the skill triggers. Under-triggering (skill exists but never fires) is far more common than over-triggering. Write descriptions that are:

- **Specific about what it does** — "Creates Playwright E2E test specs for user journeys" not "Helps with testing"
- **Pushy about when to trigger** — List concrete phrases users say: "write E2E tests", "test the login flow", "add Playwright tests". The matching system is literal — if the phrase isn't in the description, the skill won't fire.
- **Inclusive of adjacent intent** — Users don't always use the exact words. "I need browser tests" should trigger a Playwright skill even though "Playwright" isn't mentioned. Add synonyms and related phrases.

Bad: `description: Helps users with testing`
Good: `description: Generate Playwright E2E test specs for user journeys — login flows, checkout funnels, onboarding wizards, CRUD sequences. Use when the user says "write E2E tests", "test the login flow", "add Playwright tests", "I need browser tests", or describes a multi-step flow they want verified.`

## Structure: The XML Skeleton

Every SKILL.md uses the same structural tags. The agent parses these as semantic boundaries — they
define where steps begin and end, what must never happen, and when the workflow is complete.

### Required tags

```xml
<purpose>
  2-3 sentences: what this skill does and why it exists.
</purpose>

<process>
  <step name="step_name">
    Markdown content describing what happens in this step.
  </step>

  <step name="another_step">
    Another self-contained step.
  </step>
</process>

<success_criteria>
  - [ ] Criterion 1
  - [ ] Criterion 2
</success_criteria>
```

### Optional tags

| Tag | When to use |
|-----|-------------|
| `<core_principle>` | A design principle or pattern that applies across all steps (e.g., durable state) |
| `<guardrails>` | Hard constraints — "never" rules, safety boundaries, behavioral limits |
| `<!-- comments -->` | Section separators for visual grouping of related steps |

### Step naming

Steps are named, not numbered. Names should be short, descriptive, and verb-oriented:

| Good | Bad |
|------|-----|
| `route`, `scaffold`, `design`, `grade` | `step_1`, `phase_2`, `do_the_thing` |
| `capture_intent`, `run_evals`, `cleanup` | `first_step`, `main_step`, `last_step` |

### Step anatomy

Each step should be self-contained — understandable without reading other steps. Follow this pattern:

1. **One bold sentence saying what this step accomplishes** — the agent reads this to decide if it should enter the step
2. **Substeps with `###` headers** if the step has distinct parts
3. **Decision points called out** — use AskUserQuestion or decision tables
4. **State update** — what to persist after the step completes (if using durable state)
5. **Transition** — how the agent knows this step is done and what comes next

Avoid steps that have no clear end condition. "Research the topic" never ends.
"Research the topic, summarize in 3-5 bullets, and confirm with the user" has a clear exit.

## Presenting Options: AskUserQuestion

When the skill needs user input, use the AskUserQuestion pattern — not freeform blockquotes.
This gives the agent a structured interaction to execute rather than an ambiguous prompt.

```markdown
Ask via AskUserQuestion:
- header: "Short Label"
- question: "Natural language question to the user"
- options:
  - "Action verb first" — brief explanation
  - "Another option" — brief explanation
  - "Let me explain" — freeform input
```

**Rules:**
- Header: 12 characters max
- Question: natural language, one sentence
- Options: 2-5 choices, each starting with an action verb
- Always include "Let me explain" as a freeform escape hatch when the options might not cover the user's intent
- Use when the skill needs a decision — not for every interaction

**When NOT to use AskUserQuestion:**
- Open-ended creative questions ("What should this skill help the agent do?")
- Questions where the answer space is too large for predefined options
- Follow-up questions that depend heavily on the prior answer

For these, ask one question at a time as plain text.

## Decision Tables

Use tables for routing logic, conditional behavior, and categorization. Tables are easier to parse
than nested if/else prose.

```markdown
| If the user says... | Route to | Why |
|---------------------|----------|-----|
| "create a skill" | `scaffold` | Needs plugin setup first |
| "improve this skill" | `assess` | Re-eval path |
```

Good uses for tables:
- Routing decisions (intent → step)
- Conditional actions (state → behavior)
- Categorization (input → category)
- Stable vs. unstable knowledge

## Instruction Density: Rigid vs. Flexible

Every instruction exists on a spectrum:

| Rigid | Flexible |
|-------|----------|
| "Always use execFile, never exec" | "Consider using execFile for better security" |
| "Ask exactly these 4 questions in order" | "Understand the user's intent. Key areas to explore: ..." |
| Step-by-step checklist | Principles with examples |

**When to be rigid:**
- Security requirements (path traversal, timeouts, exec vs execFile) — never leave these to judgment
- Output formats that downstream tools depend on (JSON schemas, file naming conventions)
- Sequences where order matters (install before compile, compile before test)

**When to be flexible:**
- Creative decisions (naming, phrasing, architecture choices)
- Interview flow (the agent needs to adapt to what the user says)
- Recommendations that depend on context (which database, which framework)

**The calibration test:** If two different agents reading the same instruction would produce meaningfully different outputs, and one output is clearly wrong — make it rigid. If both outputs are valid but different — keep it flexible.

## Common Anti-Patterns

### Wall of text
A step that's 50+ lines of unbroken prose. The agent skims, misses substeps, or follows the first instruction and ignores the rest.

**Fix:** Break into named subsections with `###` headers. Each section should be 5-15 lines. If a section is longer, it probably contains multiple steps that should be separate.

### Instructions that assume context
"Use the pattern from earlier" or "Apply the same approach as the first step." After context compression, earlier steps are gone. Every step must be self-contained or reference a state file / reference file.

**Fix:** If a later step needs decisions from an earlier step, those decisions must be in the state file. If a later step needs patterns from an earlier step, those patterns must be in a reference file.

### Overly prescriptive examples
Showing a complete 50-line code block as "the template to follow" makes the output rigid and fragile. The agent copies the template even when the user's situation doesn't match.

**Fix:** Show the shape, not the implementation. "The tool needs a `name`, `inputSchema`, and `execute` function that validates paths against a root directory." This lets the agent adapt while preserving the constraints that matter.

### Missing escape hatches
Every skill encounters situations it wasn't designed for. If the skill has no guidance for edge cases, the agent either halts or improvises poorly.

**Fix:** Add a note in `<guardrails>` or the relevant step telling the agent what to do when it hits something unexpected: "If the user's request doesn't fit these categories, say so and explain what the skill handles. Don't force-fit."

### Filler instructions
"Make sure to think carefully about the best approach" or "Take time to consider all options." These waste tokens and the agent ignores them.

**Fix:** Delete them. If you want the agent to consider something specific, name it: "Before recommending a model, check whether the agent needs streaming — streaming narrows the provider options."

## SKILL.md vs. References: When to Split

**Keep in SKILL.md:**
- The `<process>` flow — steps, transitions, decision points
- User-facing prompts and AskUserQuestion patterns
- `<guardrails>` and `<success_criteria>`
- Tone and style guidance

**Move to references:**
- Templates and schemas (JSON formats, directory layouts, code patterns)
- Conditional content (sections that only apply in certain paths, like interactive mode)
- Domain knowledge (API details, library patterns, platform specifics)
- Detailed examples that support a brief instruction in the SKILL.md

**The test:** If removing the content from SKILL.md would break the workflow (agent wouldn't know what step comes next, or what question to ask), it stays. If removing it would reduce quality but the workflow still makes sense, it's reference material.

## Template

Minimal SKILL.md skeleton:

```markdown
---
name: skill-name
description: >
  What it does and when to trigger — be specific and pushy about trigger conditions.
  List phrases: "do X", "make Y", "I need Z".
---

# Skill Name

<purpose>
What this skill does and why it exists. 2-3 sentences.
</purpose>

<process>

<step name="first_step">
**What this step accomplishes.**

Details, substeps, decision points.
</step>

<step name="second_step">
**What this step accomplishes.**

Details, substeps, decision points.
</step>

</process>

<guardrails>
- NEVER do X
- NEVER do Y
- Always do Z when condition applies
</guardrails>

<success_criteria>
- [ ] First thing that must be true when done
- [ ] Second thing that must be true when done
</success_criteria>
```

Keep the SKILL.md under 500 lines. Use reference files in a `references/` subdirectory for
templates, schemas, and conditional content.
