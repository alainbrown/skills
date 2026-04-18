# tracer-bullet

Ship the thinnest possible end-to-end working code for a feature or new project — one happy path, real I/O, no gold-plating. Based on "tracer bullets" from *The Pragmatic Programmer*: fire a thin round through the system, see where it lands, then thicken.

## Usage

Explicit slash-command only:

```
/tracer-bullet Build me a URL shortener. POST a long URL, get a short code, redirect on GET. Node + SQLite.
/tracer-bullet Add a CLI that reads a JSONL file and emits CSV. Python.
/tracer-bullet Webhook receiver that accepts GitHub POSTs and processes them async. Go.
/tracer-bullet Complete multi-tenant SaaS with auth, RBAC, audit logs, admin dashboards.
```

The skill will not fire on generic "build X" or "implement Y" requests. Type `/tracer-bullet` to invoke it.

## What it does

Counteracts the LLM's bias toward elaborate plans and gold-plated first drafts. Produces production-shaped-but-feature-empty code that connects every layer (real DB, real HTTP, real FS), does the least possible at each layer, then hands off a checklist of deferred items.

1. **Detect context** — infers greenfield vs existing repo, language from manifests, confirms with user
2. **Adaptive interview** — asks only until it can write code (typically 2–4 questions: I/O shape, one happy-path example, hard constraints)
3. **Pattern scan** — proactively surfaces design patterns / algorithms / data structures where they'd change the tracer's shape; zero recommendations is a valid answer
4. **Five-line plan** — file list + one-line purposes, not a design doc
5. **Write tracer** — real I/O at every boundary, no mocks, no config, no error handling beyond what types force
6. **Verify** — asks how: run end-to-end, smoke test, or hand off
7. **Handoff** — lists scope cuts as a thickening checklist, exits

State persists in `.tracer-bullet-state.json` so long conversations survive context compaction.

## Features

- **Explicit-trigger discipline** — only fires on `/tracer-bullet`; won't trigger on generic build/implement phrases
- **Adaptive interview stop** — stops asking the moment ambiguity resolves, typically 2–4 questions
- **Proactive pattern recommendations** — scans for producer/consumer, state machine, strategy, pipeline, hash map vs sorted set, heap, token bucket, etc. where they'd change the tracer's code
- **Real I/O at every layer** — no mocks, no stubs, no `jest.mock`; real SQLite, real HTTP, real FS
- **Anti-gold-plating guardrails** — refuses error handling, config, retries, DI/factories, logger libraries on the first bullet
- **Scope-creep pushback** — oversized requests get sliced to one happy path; everything else goes to scopeCuts
- **Verification loop** — runs or smoke-tests the tracer; if it fails, proposes smallest fix and re-runs
- **Language-agnostic** — user picks per invocation; works for Node, Python, Go, Rust, etc.
- **Durable state file** — decisions survive context compaction

## Scope

| In scope | Out of scope (mentioned as scopeCut) |
|----------|--------------------------------------|
| Single happy path | Error taxonomies, retries, circuit breakers |
| Real I/O every layer | Performance tuning, caching |
| Proactive pattern scan | Architecture docs, C4 diagrams |
| Minimal deps to wire path | Observability, tracing, metrics |
| Greenfield init + existing-repo features | Auth, multi-tenancy, i18n |
| Running or smoke-testing | CI/CD, deployment, Dockerfiles |

## Test scenarios

| Scenario | Prompt | Description |
|---|---|---|
| greenfield-http-api | URL shortener in Node+SQLite | Tests greenfield context detection, real HTTP/DB I/O, verification loop |
| existing-repo-feature | Python CLI for JSONL→CSV | Tests existing-repo context, adaptive interview, stdlib-only constraint |
| pattern-signal | Go webhook receiver, async processing | Tests proactive producer/consumer pattern recommendation from the "fire-and-forget" signal |
| refuses-scope-creep | Full multi-tenant SaaS auth system | Tests scope pushback — skill should slice to one tiny tracer and push everything else to scopeCuts |

## Eval results

Graded 6 criteria × 4 evals = 24 comparisons against a no-skill baseline:

| Eval | Skill wins | Ties | Baseline wins |
|------|-----------|------|---------------|
| greenfield-http-api | 6/6 | 0 | 2 |
| existing-repo-feature | 4/6 | 2 | 0 |
| pattern-signal | 5/6 | 1 | 0 |
| refuses-scope-creep | 6/6 | 0 | 0 |
| **Total** | **21/24 (87.5%)** | **3** | **2** |

Skill had zero losses. Baseline's only wins were on `verification-executed` when it happened to smoke-test anyway.

### Where the skill adds value

- **Refuses gold-plating.** Baseline reflexively adds config modules, error taxonomies, health endpoints, body-size caps, 4-5 file splits before any of that was asked for. Skill keeps the tracer to 2–4 files with hardcoded values.
- **Pushes back on scope.** Given a full-SaaS prompt, baseline produced a multi-section design doc and wrote zero code. Skill sliced to `POST /signup → row inserted → {userId}`, wrote it, ran it, showed the response.
- **Names patterns out loud.** Baseline often implements the right shape (buffered channel, base62 code) without naming it — no vocabulary for what was adopted or deferred. Skill names the pattern, cites the signal, lists scopeCuts.
- **Adaptive interview.** Baseline either assumes everything silently or asks eight clarifying questions. Skill asks two to four, stops early.
- **Explicit verification.** Skill asks "run / smoke / hand off" and executes; baseline often writes code and exits.

### Where the baseline holds up

- **Runnable code.** When the task is small enough, the baseline produces working code just as well. The skill's value is shape and restraint, not correctness.
- **Occasional verification.** Some prompts make the baseline smoke-test anyway (e.g., writing a tiny test script) — skill doesn't reliably beat it on that axis alone.

## Design decisions

- **Explicit-trigger only.** Generic "build X" phrases route to other skills (scaffold, agent-forge) or default behavior. This skill's value collapses if it fires on vague requests where the user actually wants a full plan.
- **State file, despite one-shot workflow.** Interview outputs must survive context compaction; long conversations about I/O and patterns happen frequently.
- **No thickening loop.** After the tracer flies, the skill exits. User re-invokes for the next slice or thickens directly. Kept the skill small and avoided an open-ended loop that would drift back into planning.
- **Patterns recommended proactively, not just on request.** The book's *Pragmatic Programmer* spirit is that the right shape matters from the first round, not as a later refactor. Zero recommendations is a valid answer when nothing fits.
