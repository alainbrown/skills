# Patterns

Reusable patterns extracted from research exercises that aren't yet ready for the full `@forge/*` framework treatment. Each pattern lives in its own subdirectory with: source code, tests, a one-page README explaining when to use it, and a stability note.

## When something lands here

A pattern goes into `references/patterns/<name>/` when:
- It has appeared in 2+ research exercises with a stable shape (per `PATTERN_LEDGER.md`)
- It has not yet hit the extraction trigger (3+ exercises OR 2 exercises with >200 LOC of correctness-sensitive code)
- The skill needs to vendor it into produced projects, so it should live somewhere the skill can find it

## When something leaves here

A pattern leaves `references/patterns/` when:
- It hits the extraction trigger and becomes a `@forge/*` package (move to standalone or internal package)
- It turns out to be project-specific and not actually a reusable pattern (delete)
- It's superseded by a better pattern from a later exercise (deprecate, then delete)

## Distinction from other references

| Reference type | Purpose |
|----------------|---------|
| `references/interface-starters/` | Complete bootable starter projects (cli-ts, web-ts, electron-ts) — copied wholesale by the skill |
| `references/harness-snippets/` | Drop-in agent wiring per harness — replaces the starter's placeholder |
| `references/common-tools/` | The 7 common tools (bash, file ops, glob, grep, web fetch) — included via Stage 4 selection |
| `references/patterns/` | **Reusable patterns under observation** — vendored into produced projects when the skill recognizes the situation |
| `references/<other>.md` | Skill mechanism docs (cascade-logic, fork-vs-wrap, tool-test-schema, verification, state-schema, interfaces, harness-profiles) |

The first three are **stable reusable artifacts** the skill always reaches for in the right context. `references/patterns/` is the **incubator** where candidate primitives mature before they're either extracted or discarded.

## Current contents

*Empty.* The wiki-agent research exercise (#1) surfaced 5 candidate patterns, all currently logged in `PATTERN_LEDGER.md` with status `watch`. None has met the criteria to land here yet (need a 2nd sighting). When research exercise #2 lands and any of those patterns recur, the recurring ones move into this directory.
