---
name: git-squash
description: >
  Squashes a git branch into fewer, more meaningful commits with well-structured messages.
  Analyzes diffs, groups changes into logical units, detects commit message conventions from
  the repo (commitlint, .gitmessage, CONTRIBUTING.md, git history), and falls back to
  Conventional Commits. Use this skill whenever the user wants to squash commits, clean up
  branch history, rewrite commit messages, tidy up a branch before merging, or prepare a
  branch for PR review. Also trigger when users say things like "clean up my commits",
  "make my history nicer", "rewrite my branch", "organize my commits", or "squash before merge".
---

# Git Squash

<purpose>
Take a messy branch with too many commits and rewrite it into fewer, logically grouped commits
with clear, convention-aware messages. Always propose a plan and get confirmation before
rewriting any history.
</purpose>

## Workflow Overview

```
User invokes skill (optionally specifying branch)
       |
  +-----------------+
  |  SELECT MODE    |  Auto (skip to plan) or Interactive (step-by-step)
  +------+----------+
         |
  +-----------------+
  | ORIENT          |  Identify branch, base, commit count, remote status
  +------+----------+
         |
  +-----------------+
  | DETECT          |  Find repo commit conventions
  |                 |  (Interactive: present choice / Auto: use recommended)
  +------+----------+
         |
  +-----------------+
  | ANALYZE         |  Read all diffs, group into logical units
  +------+----------+
         |
  +-----------------+
  | PROPOSE         |  Present the squash plan for approval (ALWAYS shown)
  +------+----------+
         |
  +-----------------+
  | EXECUTE         |  Rewrite history (only after confirmation)
  +------+----------+
         |
  +-----------------+
  | VERIFY          |  Confirm no code was lost
  +-----------------+
```

<process>

<step name="select_mode">
**Determine how interactive the session should be.**

Ask via AskUserQuestion:
- header: "Mode?"
- question: "How would you like to run this?"
- options:
  - "Auto" — detect conventions, group commits, show final plan with one confirmation
  - "Interactive" — check in at each step for full control
  - "Let me explain" — freeform input

**Auto mode** uses all recommended defaults silently — the detected (or fallback) convention,
the best logical grouping, standard commit message format. It skips the convention choice
prompt and goes straight to the final proposal. The user still sees the full plan and must
confirm before any history is rewritten.

**Interactive mode** is the full workflow with a checkpoint at each phase.

If the user's initial message already signals a preference, skip the question:

| User says... | Mode |
|---|---|
| "just clean up my commits", "auto squash", "quick squash" | Auto |
| "help me organize my commits", "let's go through it" | Interactive |
| Ambiguous | Ask |

▶ Next: `orient`
</step>

<!-- ============================================= -->
<!-- GATHER CONTEXT                                -->
<!-- ============================================= -->

<step name="orient">
**Identify the branch, base, commit count, and remote status.**

### Identify the branch

If the user specified one, use it. Otherwise use the current branch (`git branch --show-current`).

### Determine the scope

| User says... | Base point | Notes |
|---|---|---|
| "squash the last 5 commits" | `HEAD~5` | No need to find a base branch. Works on any branch including `main`. |
| "squash my branch" / "clean up before merge" | Find the base branch | See detection order below. |

**Base branch detection order** (for "all since base" requests):
1. Upstream tracking branch's merge target (e.g., PR targets `main`)
2. `git config branch.<name>.merge`
3. Common mainline names: check which of `main`, `master`, `develop` exist locally or in `origin`
4. If ambiguous, ask: "What branch are you merging into?"

### Count commits

```
git rev-list --count <base>..<branch>
```

### Check remote status

```
git log --oneline <branch> --not --remotes
```

If the branch has been pushed, note that a force push will be needed after rewriting.

### Check for dependent branches

```
git branch --contains <branch>
```

If other local branches are rooted on this branch, warn:

> **Note: Branch `feature/auth-ui` is based on this branch. Rewriting history here will break its relationship -- it will need to be rebased afterward.**

### Check for git hooks

```
ls .git/hooks/pre-commit .git/hooks/commit-msg .husky/pre-commit .husky/commit-msg 2>/dev/null
```

Also check `package.json` for husky/lint-staged/commitlint in devDependencies. If hooks exist, warn:

> **Note: This repo has commit hooks (pre-commit, commit-msg) that will run on each new commit during the rewrite. If a hook rejects a commit mid-squash, we'll restore from backup. You can also skip hooks with `--no-verify` if you're comfortable -- the final code is unchanged, only the history is being rewritten.**

### Single commit check

If there's only 1 commit on the branch:
- Tell the user: "This branch has just 1 commit -- nothing to squash."
- Offer to rewrite the commit message using the conventions detected in `detect_conventions`.
- Stop here unless they want the message rewrite.

### Safety warnings

**Mainline branch:** If the branch is `main`, `master`, or `develop`:

> **Warning: You're about to rewrite history on `main`. This is a mainline branch -- rewriting it affects all collaborators. Are you sure you want to continue?**

Require explicit confirmation. If they confirm, proceed but **never auto-push** -- only show the push command at the end.

**Already pushed:** If the branch has been pushed to a remote:

> **Note: This branch has been pushed to `origin`. After rewriting, you'll need to force push (`git push --force-with-lease`). I won't do this automatically.**

▶ Next: `detect_conventions`
</step>

<step name="detect_conventions">
**Figure out what commit message style this repo uses.**

Read `references/convention-detection.md` for the full 5-priority detection system and the
presentation templates for interactive/auto mode.

**Detection priority order:**
1. commitlint configuration
2. `.gitmessage` template
3. `CONTRIBUTING.md` and related docs
4. Git history patterns (last 30 commits on base branch, adopt if 60%+ consistent)
5. Conventional Commits (default fallback)

**In Interactive mode:** Present what you found and let the user decide. Don't silently adopt
a convention.

**In Auto mode:** Use the highest-priority detected convention. Skip the choice prompt. Note
the selection in the proposal so the user can see it and object if needed.

▶ Next: `analyze_changes`
</step>

<!-- ============================================= -->
<!-- ANALYZE AND GROUP                             -->
<!-- ============================================= -->

<step name="analyze_changes">
**Read the actual changes and group them into logical commits.**

### Get the full picture

```
git diff --stat <base>..<branch>
git log --oneline <base>..<branch>
```

### Handle fixup/squash commits

```
git log --oneline <base>..<branch> | grep -E '^[a-f0-9]+ (fixup!|squash!)'
```

If found, pre-group them with their target commit before any other analysis. `fixup!` and
`squash!` commits are corrections to a specific earlier commit -- they always belong together.

### Read the diffs

| Branch size | Strategy |
|---|---|
| <=15 commits | Read each commit's diff individually |
| 16-49 commits | Use combined diff + per-commit summaries (`git diff <base>..<branch>` + `git log --stat`) |
| 50+ commits | Directory/file-based grouping: `git diff --stat` to see all changed files, group by directory/module, warn user that grouping is coarser |

### Group into logical units

**Primary grouping: by logical change.** Changes that work together to accomplish one thing
belong in one commit. Examples:
- A new API endpoint + its tests + its types = one commit
- A database migration + the model changes that use it = one commit
- A config file change that enables a feature + the feature code = one commit

**Secondary split: separate standalone concerns.**
- Pure refactoring that changes no behavior -- separate commit
- CI/CD changes unrelated to the feature -- separate commit
- Documentation updates not tied to a specific code change -- separate commit
- Dependency updates -- separate commit

**Target 2-4 commits** for most feature branches. If proposing 7+, you're probably splitting
too fine. But if the branch genuinely contains 5 independent changes, 5 commits is right.

### Preserve important metadata

While analyzing, collect:
- **Co-authors**: unique `Co-authored-by:` trailers and distinct author emails from `git log --format="%ae"`
- **Issue references**: `#123`, `PROJ-456`, any ticket identifiers in commit messages
- **Breaking changes**: messages containing `BREAKING CHANGE:` or `!:`
- **Signed-off-by**: `Signed-off-by:` trailers (DCO compliance)

These must survive into the final commit messages.

▶ Next: `propose_plan`
</step>

<step name="propose_plan">
**Present a clear before/after for the user to approve.**

Read `references/proposal-format.md` for the full template and examples of how to handle
user feedback (combine, reword, re-split).

Always include:
- Branch name, base, commit count reduction
- Convention used
- All current commits (truncate if >10: show first 5 and last 5 with "..." between)
- Each proposed commit with complete message and trailers
- Safety check: file count + line count unchanged

Wait for explicit confirmation. The user might say:
- "Combine commits 1 and 2" -- merge them
- "Reword commit 1" -- rewrite the message
- "Split the middleware out" -- re-split
- "Looks good" / "Go ahead" -- proceed

Iterate until they're happy.

▶ Next: `execute_rewrite`
</step>

<!-- ============================================= -->
<!-- REWRITE AND VERIFY                            -->
<!-- ============================================= -->

<step name="execute_rewrite">
**Rewrite the branch history. Only after explicit confirmation.**

### Create a backup ref

```bash
git branch git-squash-backup/<branch-name> <branch>
```

Tell the user: "I've saved a backup at `git-squash-backup/<branch-name>` in case you need to restore."

### Perform the squash

**Single-commit result:**
```bash
git checkout <branch>
git reset --soft <base>
git commit -m "<message>"
```

**Multi-commit result (2+ new commits):**
1. `git reset --soft <base>` -- all changes are now staged
2. `git reset HEAD .` -- unstage everything
3. For each proposed commit group:
   - `git add <files in this group>`
   - `git commit -m "<message>"`

If file-level grouping isn't granular enough (two logical changes touch the same file), use
`git add -p` equivalent approach. In practice this is rare -- if two concerns are tangled in
the same file, they usually belong in the same commit anyway.

### Write the commit messages

Follow the convention detected in `detect_conventions`. Each message should have:
1. **Subject line**: imperative mood, concise, within length limits
2. **Blank line**
3. **Body** (if the change warrants it): what and why, not how
4. **Trailers**: Co-authored-by, Refs, BREAKING CHANGE, Signed-off-by -- whatever was collected in `analyze_changes`

▶ Next: `verify`
</step>

<step name="verify">
**Confirm nothing was lost and present the result.**

### Diff check

```bash
git diff git-squash-backup/<branch-name>..<branch>
```

This diff should be **empty**. If it's not, something went wrong -- alert the user immediately
and offer to restore from the backup.

### Present summary

```
## Done!

**Before:** 14 commits
**After:** 3 commits
**Backup:** git-squash-backup/feature/auth-system

Diff check: No code changes -- history only.

To push this branch (force push required):
  git push --force-with-lease origin feature/auth-system

To restore the original history if needed:
  git checkout feature/auth-system
  git reset --hard git-squash-backup/feature/auth-system
```

Never auto-push. Always show the command and let the user decide.
</step>

</process>

<guardrails>
- NEVER rewrite history without explicit user confirmation on the proposal
- NEVER auto-push after rewriting -- only show the push command
- NEVER skip safety warnings for mainline branches (`main`, `master`, `develop`) regardless of mode
- NEVER proceed with a dirty working tree -- if `git status` shows uncommitted changes, tell the user to commit or stash first
- NEVER drop co-author attributions, issue references, breaking change markers, or signed-off-by trailers during the squash
- If a hook rejects a commit during the rewrite, immediately restore from the backup ref
- If the user wants to abort mid-way through the rewrite, restore from the backup ref and confirm the branch is back to its original state
- Drop empty commits silently -- they add no value
- If the branch contains merge commits, warn that the squash will linearize the history
- Call out binary files in the proposal by name but don't try to describe their content
- Call out submodule pointer changes explicitly in the proposal
- If duplicate/cherry-picked commits exist (detected via `git cherry`), exclude them and note how many were skipped
- Be direct and informative -- don't editorialize about messy commit history
</guardrails>

<success_criteria>
- [ ] Branch identified, base determined, commit count known
- [ ] Commit convention detected (or fallback chosen) and applied consistently
- [ ] Changes analyzed and grouped into logical units (target 2-4 commits)
- [ ] Important metadata preserved (co-authors, issue refs, breaking changes, sign-offs)
- [ ] Squash plan presented and explicitly approved by the user before any rewrite
- [ ] Backup ref created before rewriting
- [ ] History rewritten with clean, convention-following commit messages
- [ ] Diff check confirms zero code changes (empty diff between backup and new branch)
- [ ] Push command shown (not executed) if branch was previously pushed
</success_criteria>
