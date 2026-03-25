# Writing Good SKILL.md Files

The SKILL.md is the only thing the agent reads. Everything the agent does well or poorly traces back to what's in this file and its references. This guide covers how to write instructions that produce consistent, high-quality agent behavior.

## Frontmatter: The Trigger Problem

The `description` field determines when the skill triggers. Under-triggering (skill exists but never fires) is far more common than over-triggering. Write descriptions that are:

- **Specific about what it does** — "Creates Playwright E2E test specs for user journeys" not "Helps with testing"
- **Pushy about when to trigger** — List concrete phrases users say: "write E2E tests", "test the login flow", "add Playwright tests". The matching system is literal — if the phrase isn't in the description, the skill won't fire.
- **Inclusive of adjacent intent** — Users don't always use the exact words. "I need browser tests" should trigger a Playwright skill even though "Playwright" isn't mentioned. Add synonyms and related phrases.

Bad: `description: Helps users with testing`
Good: `description: Generate Playwright E2E test specs for user journeys — login flows, checkout funnels, onboarding wizards, CRUD sequences. Use when the user says "write E2E tests", "test the login flow", "add Playwright tests", "I need browser tests", or describes a multi-step flow they want verified.`

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
A phase that's 50+ lines of unbroken prose. The agent skims, misses steps, or follows the first instruction and ignores the rest.

**Fix:** Break into named subsections with `###` headers. Each section should be 5-15 lines. If a section is longer, it probably contains multiple steps that should be separate sections.

### Instructions that assume context
"Use the pattern from earlier" or "Apply the same approach as Phase 1." After context compression, earlier phases are gone. Every phase must be self-contained or reference a state file / reference file.

**Fix:** If a later phase needs decisions from an earlier phase, those decisions must be in the state file. If a later phase needs patterns from an earlier phase, those patterns must be in a reference file.

### Overly prescriptive examples
Showing a complete 50-line code block as "the template to follow" makes the output rigid and fragile. The agent copies the template even when the user's situation doesn't match.

**Fix:** Show the shape, not the implementation. "The tool needs a `name`, `inputSchema`, and `execute` function that validates paths against a root directory." This lets the agent adapt while preserving the constraints that matter.

### Missing escape hatches
Every skill encounters situations it wasn't designed for. If the skill has no guidance for edge cases, the agent either halts or improvises poorly.

**Fix:** Include a brief "out of scope" section that tells the agent what to do when it hits something unexpected: "If the user's request doesn't fit these categories, say so and explain what the skill handles. Don't force-fit."

### Filler instructions
"Make sure to think carefully about the best approach" or "Take time to consider all options." These waste tokens and the agent ignores them.

**Fix:** Delete them. If you want the agent to consider something specific, name it: "Before recommending a model, check whether the agent needs streaming — streaming narrows the provider options."

## SKILL.md vs. References: When to Split

**Keep in SKILL.md:**
- Workflow phases and transitions (what happens in what order)
- Decision logic (when to do X vs Y)
- User-facing prompts and questions
- Tone and style guidance
- Phase-level instructions (what the agent does in each phase)

**Move to references:**
- Templates and schemas (JSON formats, directory layouts, code patterns)
- Conditional content (sections that only apply in certain paths, like interactive mode)
- Domain knowledge (API details, library patterns, platform specifics)
- Detailed examples that support a brief instruction in the SKILL.md

**The test:** If removing the content from SKILL.md would break the workflow (agent wouldn't know what phase comes next, or what question to ask), it stays. If removing it would reduce quality but the workflow still makes sense, it's reference material.

## Structuring Phases

Each phase should follow this pattern:

1. **One sentence saying what this phase accomplishes** — the agent reads this to decide if it should enter the phase
2. **Substeps with clear names** — `### Step 1: Understand the agent` not `### Step 1`
3. **Decision points called out** — "Ask the user: ..." or "If X, do Y. If Z, do W."
4. **State update** — what to persist after the phase completes (if using durable state)
5. **Transition** — how the agent knows this phase is done and what comes next

Avoid phases that have no clear end condition. "Research the topic" is a phase that never ends. "Research the topic, then summarize what you found in 3-5 bullet points and confirm with the user" has a clear exit.
