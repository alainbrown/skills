# ml-architect

Structured interactive workflow for designing and producing runnable ML pipelines — problem definition, data strategy, model selection, training, evaluation, and deployment with cascading invalidation.

## Usage

```
# triggers ml-architect
design a training pipeline for my text classifier

# triggers ml-architect
help me think through my ML approach

# triggers ml-architect
I need to quantize my 7B model for consumer GPUs

# triggers ml-architect
set up a fine-tuning workflow for this dataset

# triggers ml-architect
help me compete in parameter-golf
```

Or invoke directly: `/ml-architect`

## What it does

Acts as an ML architect — inspects your codebase, asks deep questions about the problem space, recommends approaches with rationale, and produces a complete, deployable pipeline. Designed for expert practitioners who want structure, rigor, and traceability rather than tutorials.

## Features

- **Codebase-aware** — scans data files, notebooks, configs, dependencies, and git history before asking questions. Grounds recommendations in what actually exists.
- **12-section design catalog** — Problem Definition, Data Audit, Data Sourcing, Preprocessing, Model Selection, Model Adaptation, Training Strategy, Optimization, Evaluation, Pipeline Architecture, Deployment, and Iteration Protocol. Sections activate or skip based on use case.
- **Adaptive pacing** — front-loads analysis for well-constrained problems (competitive optimization, clear targets); goes deeper on ambiguous requests. Calibrates question depth to problem clarity.
- **Cascading invalidation** — changing a decision propagates downstream through a dependency graph. The skill identifies affected sections, explains why, and re-evaluates.
- **Durable state** — persists all decisions to `.ml-pipeline-state.json`, surviving context compression in long sessions. Enables session interruption and resumption.
- **Three outputs** — runnable pipeline (scripts, configs, Dockerfile, eval harness), feasibility probe notebook, and design spec document.
- **Framework-agnostic** — no hardcoded tools or libraries. Recommendations come from the LLM and MCP-sourced documentation, staying current as the ecosystem evolves.

## Supported use cases

| Use Case | Active Sections |
|----------|----------------|
| Fine-tuning a pretrained model | Problem Definition, Data Audit, Preprocessing, Model Selection, Adaptation, Training, Evaluation, Pipeline, Deployment, Iteration |
| Creating / curating a dataset | Problem Definition, Data Audit, Data Sourcing, Preprocessing, Evaluation, Pipeline |
| Quantizing an existing model | Problem Definition, Model Selection, Optimization, Evaluation, Deployment |
| Pretraining from scratch | Problem Definition, Data Audit, Data Sourcing, Preprocessing, Model Selection, Training, Evaluation, Pipeline, Deployment, Iteration |
| Cost/performance optimization | Problem Definition, Training, Optimization, Evaluation, Iteration |
| RAG / retrieval pipeline | Problem Definition, Data Audit, Preprocessing, Model Selection, Evaluation, Pipeline, Deployment |
| Competitive / research optimization | Problem Definition, Model Selection, Training, Optimization, Evaluation, Iteration |

## Edge cases handled

- **Vague requests** — doesn't assume a use case. Scans codebase, identifies likely problem framing, asks the user to confirm before proposing any plan.
- **Single-file projects** — doesn't impose directory structure on competition entries or self-contained scripts. Produces modifications to existing files.
- **Existing codebases** — asks before writing into existing directories. Respects project layout.
- **Session interruption** — state file captures progress after every decision. Resumes from where it left off, including mid-cascade resolution.
- **Stale state** — detects when state file references no longer match the codebase and offers to continue or start fresh.

## Test scenarios

| Scenario | Description |
|----------|-------------|
| Fine-tune text classifier | 50K labeled support tickets, EDA notebook, requirements with pandas/sklearn/torch. Tests codebase grounding, section activation for fine-tuning. |
| Quantize 7B model | LLaMA 7B in fp16, no quantization tooling. Tests focused section plan (4 sections), constraint analysis (fp16 already fits in 24GB). |
| Vague ML request | SaaS platform with user/event CSVs, churn column, no ML code. Tests disambiguation without assuming, expert tone on ambiguous input. |
| Parameter-golf competition | 1126-line train_gpt.py, competitive optimization challenge (16MB artifact, 10-min training, BPB metric). Tests adaptive pacing, front-loaded analysis, non-standard output format. |

## Eval results

**Skill win rate: 79% (19/24 criteria comparisons). Baseline wins: 0/24.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| finetune-classifier | 6/8 | 2/8 | 0/8 |
| quantize-7b | 7/8 | 1/8 | 0/8 |
| vague-request | 6/8 | 2/8 | 0/8 |

Rubric criteria: codebase awareness, problem definition depth, structured plan, recommendation quality, state management, cascade correctness, expert tone, reference utilization.

### Where the skill dominates

- **Codebase awareness** (3/3 wins) — scans data files, notebooks, configs, dependencies. Grounds questions in findings.
- **Problem definition depth** (3/3 wins) — classifies problem clarity, front-loads analysis for well-constrained problems, doesn't assume on vague requests.
- **Structured plan** (3/3 wins) — section activation from 12-section catalog with rationale. Baseline goes straight to code.
- **State management** (3/3 wins) — persists decisions, rationale, and rejected alternatives. Baseline has none.
- **Expert tone** (3/3 wins) — no tutorials, no filler, recommendation-first with reasoning for experts to verify.
- **Reference utilization** (3/3 wins) — reads sections.md for activation patterns, outputs.md for output structure at the right phases.

### Where the baseline holds up

- **Recommendation quality** (2/3 ties) — baseline produces technically sound recommendations for clear problems. The skill won on quantize-7b by comparing methods more rigorously.
- **Cascade correctness** (3/3 ties) — not tested in these evals (no upstream decision changes).

### Evolution from prior eval

Prior first-response eval: 58% (14/24). Current multi-turn eval: 79% (19/24). The multi-turn format better captures the skill's structured workflow — section walkthroughs, state management, and output generation couldn't be measured in first-response-only evals.

## Design decisions

- **SKILL.md under 500 lines** (219 lines) with three reference files for section catalog, output specs, and cascade logic. Keeps context window lean — references are loaded on demand as the agent reaches each phase.
- **Framework-agnostic by design** — the spec explicitly avoids hardcoding tools or libraries. The LLM's knowledge and MCP servers (Context7, Playwright) provide current recommendations, so the skill doesn't go stale as the ML ecosystem evolves.
- **Adaptive pacing over rigid phases** — after iteration on the parameter-golf eval, the skill now classifies problems by clarity (clear goal + known landscape, clear goal + open landscape, vague goal) and adjusts how much substance it front-loads vs. how many questions it asks. This eliminated the baseline's only win.
