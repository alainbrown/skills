# git-squash

An agent skill that squashes messy git branches into fewer, meaningful commits with convention-aware messages.

## Usage

Invoke the skill by asking your agent to clean up commits:

```bash
/git-squash clean up this branch
```

Or just invoke with natural language

```
clean up my commits before I open a PR
squash my branch into fewer commits
squash the last 5 commits on main
just auto squash my branch
```

The skill will analyze your branch, detect conventions, and propose a plan. You confirm before any history is rewritten.

## What it does

Takes a branch with too many commits (WIP, fixups, "oops forgot a file") and rewrites it into clean, logically grouped commits with proper messages — detecting your repo's commit conventions automatically.

## Features

- **Auto & Interactive modes** — auto mode skips straight to the final plan; interactive mode checks in at each step
- **Convention detection** — checks commitlint config, .gitmessage, CONTRIBUTING.md, git history patterns, falls back to Conventional Commits
- **Smart grouping** — groups by logical change (feature + tests + types = one commit), splits standalone concerns (CI, docs, refactors)
- **Metadata preservation** — co-authors, issue references (#123), breaking changes, and sign-off trailers survive the squash
- **Safety checks** — backup ref before rewrite, diff verification after, never auto-pushes

## Safety

- Mainline branches (main/master/develop): warning + extra confirmation, never auto-push
- Already-pushed branches: force-push warning, shows command but doesn't run it
- Dependent branches: warns if other branches are rooted on the target
- Git hooks: detects pre-commit/commit-msg hooks, warns they'll fire during rewrite
- Creates `git-squash-backup/<branch>` before any rewrite
- Verifies zero diff between backup and result

## Edge cases handled

- Single commit branch: nothing to squash, offers message rewrite
- "Last N commits" vs "all since base": handles both mental models
- `fixup!`/`squash!` commits: pre-groups with their target
- Very large branches (50+): switches to directory-based grouping
- Duplicate/cherry-picked commits: detected and excluded
- Submodule pointer changes: called out explicitly
- Hook failures mid-rewrite: restores from backup, offers `--no-verify`

## Test scenarios

1. **Messy feature branch** — 8 WIP commits (`wip`, `fix stuff`, `actually fix it`...), no repo conventions
   → *"clean up my commits on this branch before I open a PR"*

2. **Conventions + co-authors** — 12 commits from 2 authors, commitlint config with scope restrictions, issue refs #142 and #156
   → *"squash feature/auth into fewer commits"*

3. **Single commit** — 1 commit branch with a typo in the message
   → *"squash my branch"*

4. **Mainline branch** — 5 WIP commits on main, already pushed to origin
   → *"squash the last 5 commits on main"*

5. **Auto mode** — same repo as #1 but user wants minimal interaction
   → *"just clean up my commits, don't need to go through everything step by step"*

## Design decisions

- **Warnings over blocks on mainline** — hard-blocking `main` is patronizing on small/solo projects. Warnings + extra confirmation + no auto-push balances safety with autonomy.
- **Layered convention detection** — repos often have conventions only in practice (git history), not documented. Checking 5 sources in priority order catches both explicit and implicit conventions.
- **Auto mode** (added in iteration 2) — user feedback that power users shouldn't have to click through every choice. Auto uses all recommended defaults, still shows the final plan for confirmation.
- **Edge cases** (added in iteration 3) — hooks, dependent branches, fixup commits, and "last N" scoping added after identifying gaps the baseline couldn't handle.

## Eval results

**Skill win rate: 75% (21/28 criteria comparisons, excl. structural). Baseline wins: 0/28.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| messy-feature-branch | 6/8 | 2/8 | 0/8 |
| conventions-and-coauthors | 5/8 | 3/8 | 0/8 |
| mainline-last-n | 5/8 | 3/8 | 0/8 |
| auto-mode | 5/8 | 3/8 | 0/8 |

Rubric criteria: convention detection, convention choice, safety checks, commit grouping, proposal format, confirmation before rewrite, edge case handling, reference structure.

### Where the skill dominates

- **Convention detection** (4/4 wins) — systematic 5-source priority check every time. Baseline only checks git history.
- **Safety checks** (4/4 wins) — backup ref, hook detection, dependent branch check, never auto-pushes. Baseline missed backup refs in 2/4 evals, auto-pushed on mainline.
- **Proposal format** (4/4 wins) — structured before/after with complete messages and safety check summary. Baseline gives commands or informal summaries.

### Where the baseline narrowed the gap

- **Commit grouping** (1/4 wins, 3 ties) — baseline now produces reasonable logical groupings. Skill wins only on finer granularity (2 commits vs 1).
- **Confirmation** (2/4 wins, 2 ties) — baseline confirms before rewriting in most cases.

### Evolution from prior eval

Prior eval used pass/fail metrics (100% vs 71.3%). Current eval uses rubric-based grading (75% win rate). Not directly comparable but both confirm: the skill adds consistent value on convention detection, safety, and structured proposals. The baseline improved on commit grouping and basic confirmation flow.
