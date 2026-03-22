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

Tested across 4 iterations with 5 scenarios (messy branch, conventions + co-authors, single commit, mainline branch, auto mode), each compared against a no-skill baseline.

| Metric | With skill | Baseline | Delta |
|--------|-----------|----------|-------|
| Pass rate | 100% (37/37) | 71.3% (17/25) | +28.7% |
| Convention detection | Always | Inconsistent | Skill checks 5 sources every time |
| Convention choice | Always offered | Never | Baseline silently adopts or ignores |
| Confirmation prompt | Always | Inconsistent | Baseline sometimes gives raw rebase instructions |
| Safety checks | Hooks, deps, backup | Partial | Baseline never checks hooks or dependent branches |

### Where the baseline holds up

- Commit grouping quality is comparable — both produce reasonable logical groups
- Force-push warnings on pushed branches
- Single-commit detection

### Where the skill adds value

- Consistent convention detection and user choice
- Hook and dependent branch awareness (prevents messy failures)
- Structured before/after proposal format
- Auto mode for users who just want it done
- fixup!/squash! commit handling
- "Last N" scoping support
