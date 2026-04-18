---
name: tracer-bullet
description: >
  Ship thinnest possible end-to-end working code for a feature or new project — one happy path,
  real I/O, no gold-plating. Interviews for inputs, outputs, and constraints; proactively
  recommends design patterns, algorithms, and data structures where they fit; writes working
  code; verifies it runs. Based on "tracer bullets" from The Pragmatic Programmer — fire a thin
  round all the way through the system, then adjust aim. ONLY triggers on the explicit slash
  command `/tracer-bullet`. Do not trigger on generic "build X", "implement Y", "make a feature"
  phrases — those belong to other skills. Users who want this skill type the slash command
  explicitly.
---

# Tracer Bullet

<purpose>
Build the thinnest end-to-end path for a feature or new project. Real input → real output,
no mocks, no fallbacks, no configuration options, no retries, no error taxonomy. One happy
path that actually runs. Interview stops as soon as enough is known to write code. Patterns,
algorithms, and data structures are recommended proactively where they fit — not as planning
overhead, but as the right shape for the code being written.
</purpose>

<core_principle>
**Tracer ≠ MVP ≠ prototype.** A tracer bullet is the scaffold that connects every layer the
real system will use, doing the least possible work at each layer. It is production-shaped
but feature-empty. The value is visibility: you see the full path working before thickening
any part of it.

**Bias to code, not planning.** These models are tuned to produce elaborate plans. This skill
counteracts that. The interview ends the moment the code could be written. Plans are a single
paragraph or a five-line file list — never a document.

**Durable state via `.tracer-bullet-state.json`.** Conversations about I/O, constraints, and
pattern decisions can run long. State survives context compaction and is the single source of
truth for the write step.

- Write after each step completes or a decision changes.
- Read at the top of every step — do not trust in-context memory after compaction.
- Delete at handoff.

Schema (see `references/state-schema.md` for full detail):

```
phase: "detect" | "interview" | "recommend" | "plan" | "write" | "verify" | "done"
context: { mode: "greenfield" | "existing", cwd, language, stackHints[] }
io: { inputs[], outputs[], invocation }        // invocation = CLI | HTTP | library | cron | event
happyPath: string                              // one concrete example, no alternatives
constraints: { sync: bool, perf?, env?, deps? }
patterns: [{ kind: "pattern"|"algo"|"ds", name, reason, accepted: bool }]
tracerPlan: [{ file, purpose }]                // ≤ 7 entries for a tracer
verification: { mode: "run" | "smoke" | "handoff", command? }
scopeCuts: string[]                            // deferred items for post-tracer thickening
```
</core_principle>

<process>

<step name="check_trigger">
**Verify the skill was invoked explicitly.**

This skill only runs when the user types `/tracer-bullet`. If it appears to be firing from a
generic phrase like "build me X" or "implement Y" without the slash command, stop and say:

> "Tracer Bullet only runs when invoked explicitly with `/tracer-bullet`. Did you mean to
> invoke it?"

If yes, proceed. If no, hand off.

▶ Next: `detect_context`
</step>

<step name="detect_context">
**Infer whether this is greenfield or an existing repo, and which language/stack applies.**

Inspect `cwd` once:

| Signal | Inference |
|--------|-----------|
| `package.json` present | existing, JS/TS |
| `pyproject.toml` / `requirements.txt` | existing, Python |
| `Cargo.toml` | existing, Rust |
| `go.mod` | existing, Go |
| `pom.xml` / `build.gradle` | existing, Java/Kotlin |
| Empty dir or unrelated files | greenfield |
| Multiple stacks | existing, ambiguous — ask |

Confirm via AskUserQuestion:
- header: "Context"
- question: "Detected [greenfield | existing X repo]. Proceed with that, or different?"
- options:
  - "Use detected" — proceed with inferred context
  - "Greenfield" — treat as new project, ignore surrounding files
  - "Different stack" — user picks language/framework
  - "Let me explain" — freeform

If greenfield, also ask for language/runtime unless user stated it in the invocation. Do not
recommend a stack — user picks.

Write initial state file with `context`. Set `phase: "interview"`.

▶ Next: `interview`
</step>

<step name="interview">
**Adaptive interview. Stop the moment code could be written.**

Goal: extract the minimum to write one concrete happy path. Not a spec. Not a design doc.
Four things, in this order, one question per response:

1. **Inputs** — what goes in? Shape, source, invocation method (CLI arg, HTTP body, function
   call, queue message, file).
2. **Outputs** — what comes out? Shape, destination (stdout, HTTP response, DB row, file, etc.).
3. **One happy path example** — concrete values, not types. "User posts `{email:'a@b.c'}` →
   row inserted → response `{id: 'u_123'}`". If the user answers in types, push once for a
   concrete example.
4. **Hard constraints only** — sync vs async, any perf ceiling that forces algorithm choice,
   any environment requirement (runs in browser, runs on edge, no deps). Do not ask about
   nice-to-haves, error handling, logging, retries, auth, or config.

### Adaptive stop

After each answer, ask yourself: "Could I now write a concrete working tracer?" If yes, stop.
If no, ask the next most-blocking question. Never hit all four mechanically — the interview
ends when ambiguity ends. Typical tracer: 2–4 questions.

### Anti-patterns to refuse

If the user drifts into planning territory — error types, multiple user flows, configuration,
future features, auth modes — push back once:

> "That's thickening — not the first bullet. I'll add it to `scopeCuts` and we'll come back
> to it after the tracer flies. For now, one happy path."

Update state: `io`, `happyPath`, `constraints`, and any `scopeCuts` collected.

▶ Next: `recommend_patterns`
</step>

<step name="recommend_patterns">
**Proactively scan the interview for pattern / algorithm / data-structure fits. Recommend inline.**

Read `.tracer-bullet-state.json`. Consult `references/pattern-library.md` for the recommendation
cheat-sheet. Look at `io`, `happyPath`, and `constraints` and surface anything that meaningfully
improves the tracer's shape.

### Rules

- **Only recommend if it changes the code.** A pattern that is "nice to know" but wouldn't
  alter the tracer belongs in `scopeCuts`, not here.
- **Name the pattern, give a one-line reason, show where it goes.** No essays. Example:
  > "Queue + worker (producer/consumer): the HTTP handler returns fast, a worker drains the
  > queue. Fits because your input is fire-and-forget async. The tracer will have `enqueue()`
  > and `drainOnce()` — the drain loop comes later."
- **Bias toward boring choices.** A hash map beats a trie for the tracer unless the interview
  explicitly forced the trie.
- **Zero recommendations is a valid answer.** Most tracers don't need anything fancy.

Present all recommendations in one message and ask via AskUserQuestion which to adopt
(`multiSelect: true`). User can accept all, some, or none. Record each in state with
`accepted: bool`.

▶ Next: `plan_tracer`
</step>

<step name="plan_tracer">
**Produce a five-line tracer sketch — file list with one-line purposes. Confirm, then code.**

Not a design doc. Not a spec. A file tree with one sentence per file. Typical tracer has
2–6 files. If the list grows past 7, the scope is wrong — trim and push items to `scopeCuts`.

Format:

```
Tracer plan (<language/stack>):
  src/<file-1>   — <one-line purpose>
  src/<file-2>   — <one-line purpose>
  ...
Accepted patterns: <names or "none">
Verification: <placeholder — decided after writing>
Cut from tracer: <scopeCuts items, if any>
```

Confirm via AskUserQuestion:
- header: "Fire?"
- question: "Sketch above. Fire the tracer?"
- options:
  - "Fire" — write the code now
  - "Trim more" — something still feels thick
  - "Add one thing" — a piece is missing from the path
  - "Let me explain" — other feedback

Update state with `tracerPlan`. Set `phase: "write"`.

▶ Next: `write_tracer`
</step>

<step name="write_tracer">
**Write the tracer. One file at a time. Real I/O at every boundary.**

Read `.tracer-bullet-state.json` first — write-time is where state matters most because the
interview may be gone after compaction.

### Non-negotiables

- **Real I/O at boundaries.** If the path hits a DB, hit a real DB (SQLite file, local
  Postgres, in-memory is fine if the driver is the real driver). If it's HTTP, bind a real
  port. No mocks, no fakes, no "we'll wire it up later." The point of a tracer is that every
  layer is connected.
- **One happy path only.** No branches for edge cases. No null checks that aren't required by
  the type system. No try/catch unless the language forces it.
- **No configuration.** Hardcode values. A tracer has no `.env`, no flags, no options object.
  Config is thickening.
- **No abstractions invented for the tracer.** Interfaces, DI, factories, generics — only if
  a pattern the user accepted in `recommend_patterns` requires them.
- **Real dependencies only.** If a library is needed (HTTP server, DB driver, queue), install
  it. Do not hand-roll.
- **No tests.** Tests are a separate slice. The tracer proves the path runs — `verify` handles
  proof.

### Write order

Outside-in or inside-out, doesn't matter. What matters: every file committed to disk must be
syntactically valid and consistent with the others. Do not write half a file and move on.

For greenfield: initialize the project (`npm init -y`, `cargo init`, etc.), install deps,
write files. Keep `package.json` / equivalent minimal — one `start` script, the runtime deps,
nothing else.

### Surface what you wrote

After writing, list the files and their sizes. No explanation of what each line does — the
code speaks. Update state: `phase: "verify"`.

▶ Next: `verify`
</step>

<step name="verify">
**Ask how the user wants verification. Execute the chosen level.**

Ask via AskUserQuestion:
- header: "Verify?"
- question: "Tracer written. How should I prove it works?"
- options:
  - "Run end-to-end" — I'll execute the full path and show the output (recommended when real services are reachable)
  - "Smoke test" — compile / type-check / lint only
  - "Hand off" — I trust it, I'll run it myself
  - "Let me explain" — specific check needed

### Run end-to-end

Execute the path as described in `happyPath`. Capture stdout/stderr. If a server, start it,
curl it, show the response, stop it. If a CLI, invoke with the example input, show output.
If it fails: report the failure, propose the smallest fix, apply, re-run. Do not add error
handling that wasn't in the tracer.

### Smoke test

Run the language's canonical check: `tsc --noEmit`, `cargo check`, `mypy`, `go build`, etc.
Show the result. If it fails, fix and re-run.

### Hand off

State the run command and exit.

Record `verification` in state.

▶ Next: `handoff`
</step>

<step name="handoff">
**Show the scope cuts as a thickening checklist. Exit.**

The value of keeping `scopeCuts` isn't a promise to come back — it's a record of everything
that was consciously deferred so the user can decide what to thicken next.

Format:

```
Tracer flew. Suggested thickening (not done):
  - <scopeCut 1>
  - <scopeCut 2>
  - ...

Invoke /tracer-bullet again for the next slice, or thicken any of these directly.
```

If `scopeCuts` is empty, skip the list and just say "Tracer flew."

Delete `.tracer-bullet-state.json`.

▶ Done.
</step>

</process>

<guardrails>
- NEVER fire except on explicit `/tracer-bullet` invocation — no generic "build X" matching
- NEVER write elaborate plans, design docs, or multi-paragraph summaries — the code is the plan
- NEVER mock I/O boundaries — real DB, real HTTP, real FS at every layer
- NEVER add error handling, retries, config, or fallbacks to the first tracer — all thickening
- NEVER invent abstractions (interfaces, factories, DI) unless a user-accepted pattern demands it
- NEVER continue the interview past the point where code could be written — stop early
- NEVER recommend a pattern that wouldn't change the tracer's code — record as scopeCut instead
- NEVER ship without running the verification the user chose — if it fails, fix and re-run
- Always write to `.tracer-bullet-state.json` after each step so long conversations survive compaction
- Always delete `.tracer-bullet-state.json` after handoff
- If the user's request is too large for one tracer, say so and propose a slice
- If verification fails twice, show the output verbatim and ask the user how to proceed
</guardrails>

## Scope Boundaries

| In scope | Out of scope (mention as scopeCut, do not implement in tracer) |
|----------|----------------------------------------------------------------|
| Single happy path | Error taxonomies, retries, circuit breakers |
| Real I/O at every layer | Performance tuning, caching |
| One pattern / algo / DS recommendation pass | Architecture docs, C4 diagrams |
| Minimal deps to wire the path | Observability, tracing, metrics |
| Greenfield init or existing-repo feature | Auth, multi-tenancy, i18n |
| Running the tracer or smoke-testing it | CI/CD, deployment, Dockerfiles |

<success_criteria>
- [ ] Invocation verified as explicit `/tracer-bullet` slash command
- [ ] Context detected or confirmed (greenfield / existing, language)
- [ ] Interview captured inputs, outputs, one happy path, hard constraints — nothing more
- [ ] Patterns / algorithms / data structures proactively surfaced; user accepted a subset (possibly empty)
- [ ] Tracer plan: ≤ 7 files, each with one-line purpose
- [ ] Tracer code written: real I/O, no mocks, no config, no error handling beyond what types require
- [ ] Verification executed at the level the user chose, and passed
- [ ] `scopeCuts` surfaced to the user as a thickening checklist
- [ ] `.tracer-bullet-state.json` deleted
</success_criteria>
