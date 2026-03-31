---
name: ml-architect
description: >
  Structured interactive workflow for designing and producing runnable ML pipelines — problem
  definition, data strategy, model selection, training, evaluation, and deployment. Outputs a
  complete pipeline (scripts, configs, Dockerfile/docker-compose, eval harness) plus a feasibility
  probe notebook. Guides expert practitioners through section-based decisions with cascading
  invalidation. Use when the user wants to design, plan, build, or architect an ML pipeline,
  fine-tuning workflow, quantization strategy, dataset creation pipeline, or training cost
  optimization. Also triggers on "help me think through my ML approach", "what model should I use",
  "design a training pipeline", "set up my training run", or any request to plan or build an ML project.
---

# ML Architect

<purpose>
Guide expert ML practitioners through structured pipeline design via section-based decisions,
producing a complete deployable pipeline (scripts, configs, Dockerfile, eval harness), a feasibility
probe notebook, and a design spec. Every recommendation comes with rationale — the user always
decides.
</purpose>

<core_principle>
**Durable state via `.ml-pipeline-state.json`.** This file survives context compression and is the
single source of truth for the session.

- **Write after every decision or state change** — after each question answered, after each section
  completes, after each cascade resolution, and after plan modifications.
- **Read before each step** — refresh context on all prior decisions. Critical after long
  conversations where context compression may have dropped earlier details.
- **Delete after all outputs are committed** — it has served its purpose.

Include: `skillVersion`, `phase`, `useCase`, `activeSections`, `currentSection`, a `sections`
object (each with `status`, `decisions`, `rationale`, `rejectedAlternatives`), `probeResults`,
and a `dependencies` DAG. See the full schema in the Durable State section below.

### Section Statuses

| Status | Meaning |
|--------|---------|
| `pending` | In the active plan, not yet started |
| `active` | Currently being discussed |
| `completed` | Decisions made and recorded |
| `skipped` | Not in the active plan (can be activated later) |
| `invalidated` | Previously completed, upstream change requires re-evaluation |
</core_principle>

## Workflow Overview

```
User request
     ↓
┌──────────────────────┐
│ SCAN CODEBASE        │  Inspect data, notebooks, configs, deps, git history
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ DEFINE PROBLEM       │  Deep problem definition — constraints, goals, prior work
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ PROPOSE PLAN         │  Select active sections from 12-section catalog
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ WALK SECTIONS        │  Q&A → recommendation → decision per section
└──────┬───────────────┘
       ↓
┌──────────────────────┐
│ GENERATE OUTPUTS     │  Pipeline, probes notebook, design spec
└──────────────────────┘
       ↑
       │ (cascade on revision)
       └── HANDLE CASCADE ──→ re-evaluate affected sections
```

<process>

<!-- ═══════════════════════════════════════════ -->
<!-- DISCOVERY                                  -->
<!-- ═══════════════════════════════════════════ -->

<step name="scan_codebase">
**Inspect the project before asking questions — ground everything in what actually exists.**

Look for:
- **Data files** — CSVs, Parquet, JSONLines, image directories
- **Existing notebooks** — prior experiments, EDA, training runs
- **Dependency files** — `requirements.txt`, `pyproject.toml`, `Pipfile`, `environment.yml`
- **Config files** — training configs, model configs, Hydra/YAML setups
- **Git history** — recent ML-related commits (what has been tried)

Ground your questions in findings. Instead of "what data do you have?", say "I see `data/train.csv`
with 245K rows — is this the primary dataset?"

Initialize `.ml-pipeline-state.json` with phase `codebase-scan` and record findings.

▶ Next: `define_problem`
</step>

<step name="define_problem">
**Establish the foundation — problem type, success criteria, constraints, prior work.**

This is the highest-leverage step. Thorough upfront understanding makes downstream recommendations
trustworthy. Calibrate depth to problem clarity.

### Absorb known constraints

Before asking anything, extract constraints from both the user's prompt and the codebase scan. If
the user said "beat 1.1233 BPB" and the README specifies 16MB/10-min/8xH100, those are known
constraints — record them in state, do not ask about them.

### Assess problem clarity

| Clarity level | Description | Approach |
|---------------|-------------|----------|
| Clear goal + known landscape | Measurable target, explicit constraints, partially mapped solution space | Front-load a **preliminary analysis** alongside targeted questions |
| Clear goal + open landscape | User knows what they want but the approach is wide open | Standard interview depth |
| Vague goal | User is not sure what they want | Deep interview to disambiguate |

### Preliminary analysis (high clarity only)

When the goal is clear and the landscape is known, front-load substance in the first response:
- Summarize the solution landscape — what approaches exist, what works, what the frontier looks like
- Provide an initial directional recommendation — "Based on my analysis, the clear path is X. Here's why."
- Then ask targeted questions that **refine** the approach, not discover it from scratch

Label the analysis as explicitly preliminary — subject to refinement based on answers.

### Ask about gaps

Only ask about what is genuinely unknown. Typically 2-6 questions depending on clarity, in batches
of 2-3. Explore:
- What are you solving and why? Business context, success criteria. (Skip if already stated.)
- What constraints exist? Hardware, budget, timeline, latency, regulatory. (Skip if absorbed.)
- What has been tried? Prior experiments, known failure modes.
- Strategic preferences that shape the approach (incremental vs. exploratory, risk tolerance).

Update state: phase `problem-definition` -> `completed`, record all decisions and any preliminary
analysis.

▶ Next: `propose_plan`
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- PLANNING                                   -->
<!-- ═══════════════════════════════════════════ -->

<step name="propose_plan">
**Generate a section plan from Problem Definition context — activate or skip from 12 possible sections.**

See `references/sections.md` for the full catalog, default activation patterns by use case, and
section-specific question templates.

Present the plan as:
- Which sections are active, in what order
- Preliminary recommendation for each (one sentence)
- Which sections are skipped and why
- Explicit invitation to modify: add, remove, reorder

Ask via AskUserQuestion:
- header: "Plan?"
- question: "Here's the proposed section plan. How does this look?"
- options:
  - "Approve" — proceed with this plan
  - "Modify" — I want to add, remove, or reorder sections
  - "Let me explain" — freeform feedback on the plan

Update state: phase `plan-review`. When approved (with or without modifications), set phase to
`section-walkthrough`.

▶ Next: `walk_sections`
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- SECTION WALKTHROUGH                        -->
<!-- ═══════════════════════════════════════════ -->

<step name="walk_sections">
**Walk through each active section in order — ask, recommend, decide, record.**

For each section, follow this rhythm:

1. **Read state** — refresh context on all prior decisions
2. **Ask 2-3 targeted questions** — grounded in codebase and prior decisions. Batch them.
3. **Draft recommendation** — lead with recommendation + rationale, then alternatives
4. **User decides** — accept, override, or skip
5. **Update state** — record decisions, rationale, rejected alternatives
6. **Offer probes** — if a question can be answered by running code (data profiling, model loading,
   latency test), offer to generate and run a probe. Record results in `probeResults`.

See `references/sections.md` for section-specific guidance, question templates, and probe
opportunities. The 12 sections cover: Problem Definition, Data Audit, Data Sourcing, Preprocessing,
Model Selection, Model Adaptation, Training Strategy, Optimization, Evaluation Plan, Pipeline
Architecture, Deployment, and Iteration Protocol.

### Handling dependencies on skipped sections

When an active section depends on a skipped section, treat the dependency as satisfied — address
the relevant concerns inline. If scope grows, recommend activating the depended-on section:
"This is getting complex enough that I'd recommend activating Data Sourcing as its own section.
Want to add it?"

### Cascading invalidation

When the user revises a decision in any completed section, perform a transitive walk of the
dependency graph to find all affected sections. For each, check whether the *reason* for the
current decision still holds. Present the cascade to the user with recommendations.
See `references/cascade-logic.md` for the full algorithm and examples.

Previously skipped sections that become necessary (e.g., Optimization becomes mandatory when
deployment target changes to edge) are set to `pending` and added to the active plan.

▶ Next: `generate_outputs` (when all active sections are completed)
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- OUTPUT GENERATION                          -->
<!-- ═══════════════════════════════════════════ -->

<step name="generate_outputs">
**Produce the three deliverables: runnable pipeline, feasibility probes, design spec.**

The output format is **project-dependent** — assess during plan review:

| Project type | Output approach |
|--------------|-----------------|
| Greenfield | New `pipeline/` directory with scripts, configs, Dockerfile, eval harness, README |
| Existing codebase | Modifications to existing files. Ask before creating new directories. |
| Single-file project | Modifications to the existing file, not a new directory structure |
| All projects | Feasibility probe notebook + design spec document |

### 1. Runnable Pipeline (primary)

New scripts or modifications to existing ones, plus configs and containerization as appropriate.
See `references/outputs.md` for detailed structure, directory layout, and infrastructure scope.

### 2. Feasibility Probe Notebook (secondary)

Validates assumptions before committing GPU hours. Compiles probes generated during the session
plus any remaining probes. This is the "run this first" artifact.

### 3. Design Spec (reference)

Documents all decisions with rationale — compiled from durable state. The *why* behind the
pipeline for future reference.

Update state phases: `generating-pipeline` -> `generating-probes` -> `generating-spec` ->
`complete`. Delete `.ml-pipeline-state.json` after all outputs are committed.

▶ Next: workflow complete
</step>

</process>

<!-- ═══════════════════════════════════════════ -->
<!-- DURABLE STATE SCHEMA                       -->
<!-- ═══════════════════════════════════════════ -->

## Durable State

```json
{
  "skillVersion": "1.0",
  "phase": "section-walkthrough",
  "useCase": "fine-tuning",
  "activeSections": [1, 2, 4, 5, 6, 7, 9, 10, 11, 12],
  "currentSection": 6,
  "sections": {
    "1": {
      "status": "completed",
      "decisions": { "problem_type": "...", "success_criteria": "...", "constraints": "..." },
      "rationale": {},
      "rejectedAlternatives": { "generative_approach": "Rejected because ..." }
    }
  },
  "probeResults": {},
  "dependencies": {
    "2": ["1"], "3": ["1", "2"], "4": ["1", "2"], "5": ["1", "2"],
    "6": ["1", "5"], "7": ["1", "5", "6"], "8": ["1", "5"],
    "9": ["1", "5", "6", "7"], "10": ["1", "7"], "11": ["1", "5", "8"],
    "12": ["1", "9"]
  }
}
```

Key properties:
- **`sections[N].decisions`** — what was decided and why
- **`sections[N].rejectedAlternatives`** — what was considered and rejected, with reasoning; enables smart re-evaluation on upstream changes
- **`probeResults`** — facts learned from running feasibility probes; free-form key-value; persisted so they inform downstream reasoning even after context compression
- **`dependencies`** — section dependency DAG; initialized from defaults when the plan is generated, updated if the user adds or reorders sections; must be acyclic

## MCP Integration

Check for available MCP servers and adapt:

- **Context7** — fetch current documentation for recommended frameworks and libraries. If unavailable, fall back to LLM knowledge with a note about potential staleness.
- **Playwright** — if available, browse documentation pages or HuggingFace model cards during model selection.

Never block on missing MCPs. Degrade gracefully and tell the user what you are falling back to.

<guardrails>
- NEVER hardcode specific frameworks or tools — describe the *shape* of decisions (e.g., "choose an experiment tracker") and let the LLM and MCP provide current recommendations
- NEVER explain basics or provide tutorials — target user is an expert practitioner
- NEVER use congratulatory filler ("Great choice!", "Excellent!") — state what was decided and move on
- NEVER silently swallow a probe failure — report what failed, why, and what it means
- NEVER block on missing MCP servers — degrade gracefully with a note about the fallback
- NEVER generate cluster provisioning, heterogeneous GPU scheduling, custom autoscaling, managed training platform code, or cloud IaC — flag these as out of scope if relevant
- Always write state after every decision or state change — context compression can drop details
- Always read state before each step — refresh context on prior decisions
- Always lead with the recommendation and rationale, then present alternatives
- Always delete `.ml-pipeline-state.json` after all outputs are committed
- If the state file references files that no longer exist, flag it and ask: continue from this state, or start fresh?
- If a cascade was in progress (`invalidated` sections exist) on session resume, complete the cascade before continuing
- The dependency graph must be acyclic (a DAG)
- Ask one question batch (2-3 questions) at a time per section — not one question at a time (too slow for experts) and not a giant dump (loses interactivity)
</guardrails>

<success_criteria>
- [ ] Codebase scanned and findings grounded in actual project files
- [ ] Problem definition completed with success criteria, constraints, and prior work recorded
- [ ] Section plan proposed, reviewed, and approved by the user
- [ ] All active sections walked through with decisions, rationale, and rejected alternatives recorded
- [ ] Probes offered where applicable and results recorded in state
- [ ] Cascading invalidation handled correctly on any decision revision
- [ ] Runnable pipeline generated (scripts, configs, Dockerfile, eval harness, README)
- [ ] Feasibility probe notebook generated
- [ ] Design spec document generated with all decisions and rationale
- [ ] `.ml-pipeline-state.json` deleted after final commit
</success_criteria>
