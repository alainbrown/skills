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

# Git Squash — Intelligent Branch History Rewriter

You take a messy branch with too many commits and rewrite it into fewer, logically grouped commits with clear, convention-aware messages. You always propose a plan and get confirmation before rewriting any history.

## Mode Selection

Before starting, offer the user a choice of how interactive they want the process to be:

```
How would you like to run this?

- **A) Auto mode** — I'll detect conventions, group commits, and show you the
  final plan. One confirmation at the end before rewriting.
- **B) Interactive mode** — I'll check in at each step: convention choice,
  grouping review, message tweaks. More control.
```

**Auto mode** uses all recommended defaults silently — the detected (or fallback) convention, the best logical grouping, standard commit message format. It skips the convention choice prompt and goes straight to the final proposal. The user still sees the full plan and must confirm before any history is rewritten. Safety warnings (mainline branch, force push) are never skipped regardless of mode.

**Interactive mode** is the full workflow with a checkpoint at each phase.

If the user's initial message already signals a preference, respect it:
- "just clean up my commits" / "auto squash" / "quick squash" → default to Auto
- "help me organize my commits" / "let's go through it" → default to Interactive
- Ambiguous → ask

## Workflow Overview

```
User invokes skill (optionally specifying branch)
       ↓
  ┌─────────────────┐
  │  MODE SELECT    │  Auto (skip to plan) or Interactive (step-by-step)
  └──────┬──────────┘
         ↓
  ┌─────────────────┐
  │ 1. ORIENT       │  Identify branch, base, commit count, remote status
  └──────┬──────────┘
         ↓
  ┌─────────────────┐
  │ 2. DETECT       │  Find repo commit conventions
  │                 │  (Interactive: present choice / Auto: use recommended)
  └──────┬──────────┘
         ↓
  ┌─────────────────┐
  │ 3. ANALYZE      │  Read all diffs, group into logical units
  └──────┬──────────┘
         ↓
  ┌─────────────────┐
  │ 4. PROPOSE      │  Present the squash plan for approval (ALWAYS shown)
  └──────┬──────────┘
         ↓
  ┌─────────────────┐
  │ 5. EXECUTE      │  Rewrite history (only after confirmation)
  └──────┬──────────┘
         ↓
  ┌─────────────────┐
  │ 6. VERIFY       │  Confirm no code was lost
  └─────────────────┘
```

---

## Phase 1: Orient

Gather the facts before doing anything.

1. **Identify the branch.** If the user specified one, use it. Otherwise, use the current branch (`git branch --show-current`).

2. **Determine the scope — "last N" vs "all since base".**

   The user might say either:
   - "squash the last 5 commits" → use `HEAD~5` as the base point
   - "squash my branch" / "clean up before merge" → find the base branch

   For **"last N" requests:** the base is `HEAD~N`. No need to find a base branch. This works on any branch including `main`.

   For **"all since base" requests:** identify the base branch. Try these in order:
   - The upstream tracking branch's merge target (e.g., if the branch tracks `origin/feature` and the PR targets `main`)
   - The branch configured in `git config branch.<name>.merge`
   - Common mainline names: check which of `main`, `master`, `develop` exist locally or in `origin`
   - If ambiguous, ask the user: "What branch are you merging into?"

3. **Count commits.** Run `git rev-list --count <base>..<branch>`. This is the number of commits to work with.

4. **Check remote status.** Run `git log --oneline <branch> --not --remotes` to see if all commits are local. If the branch has been pushed, note that a force push will be needed after rewriting.

5. **Check for dependent branches.** Run `git branch --contains <branch>` to see if any other local branches are rooted on this branch. If so, warn:

   > **Note: Branch `feature/auth-ui` is based on this branch. Rewriting history here will break its relationship — it will need to be rebased afterward.**

6. **Check for git hooks.** Look for active hooks that will fire during the rewrite:

   ```
   ls .git/hooks/pre-commit .git/hooks/commit-msg .husky/pre-commit .husky/commit-msg 2>/dev/null
   ```

   Also check `package.json` for husky/lint-staged/commitlint in devDependencies. If hooks exist, warn:

   > **Note: This repo has commit hooks (pre-commit, commit-msg) that will run on each new commit during the rewrite. If a hook rejects a commit mid-squash, we'll restore from backup. You can also skip hooks with `--no-verify` if you're comfortable — the final code is unchanged, only the history is being rewritten.**

7. **Check for a single commit.** If there's only 1 commit on the branch:
   - Tell the user: "This branch has just 1 commit — nothing to squash."
   - Offer to rewrite the commit message if they'd like (using the conventions detected in Phase 2).
   - Stop here unless they want the message rewrite.

### Mainline branch warning

If the branch is `main`, `master`, or `develop`:

> **Warning: You're about to rewrite history on `main`. This is a mainline branch — rewriting it affects all collaborators. Are you sure you want to continue?**

Require explicit confirmation. If they confirm, proceed with the full workflow but **never auto-push** — only tell them the push command at the end.

### Already-pushed branch warning

If the branch has been pushed to a remote:

> **Note: This branch has been pushed to `origin`. After rewriting, you'll need to force push (`git push --force-with-lease`). I won't do this automatically.**

---

## Phase 2: Detect Commit Conventions

Figure out what commit message style this repo uses. Read `references/convention-detection.md` for the full 5-priority detection system (commitlint → .gitmessage → CONTRIBUTING.md → git history → Conventional Commits fallback) and the presentation templates for interactive/auto mode.

---

## Phase 3: Analyze Changes

Now read the actual changes and figure out how to group them.

### Step 1: Get the full picture

Run these to understand the total scope of changes:

```
git diff --stat <base>..<branch>
git log --oneline <base>..<branch>
```

### Step 2: Handle `fixup!` and `squash!` commits

Before analyzing diffs, check for git's native autosquash markers:

```
git log --oneline <base>..<branch> | grep -E '^[a-f0-9]+ (fixup!|squash!)'
```

If found, these commits are corrections to a specific earlier commit (the one named after the prefix). Pre-group them with their target commit before doing any other analysis. For example, if you see:

```
abc1234 add auth middleware
def5678 fixup! add auth middleware
```

These two always belong together — the fixup is a correction to the auth middleware commit. Fold them before deciding on logical groupings.

### Step 3: Read the diffs

For each commit, examine what changed:

```
git log --format="%H %s" <base>..<branch>
```

Then for each commit (or for the combined diff if there are many small commits):

```
git diff <commit>~1..<commit> --stat
git diff <commit>~1..<commit>
```

**Scaling for large branches (>15 commits):** Reading every individual diff is expensive. Instead, work with the combined diff and the per-commit summaries:

```
git diff <base>..<branch>
git log --stat --format="%H %s" <base>..<branch>
```

**Very large branches (50+ commits):** At this scale, per-commit analysis is impractical. Switch to a directory/file-based grouping strategy:
1. Use `git diff --stat <base>..<branch>` to see all changed files
2. Group by directory or module (e.g., all `src/auth/` changes together, all `tests/` together)
3. Use `git log --oneline <base>..<branch> -- <path>` to see which commits touched each group
4. Warn the user that the grouping is coarser due to branch size

### Step 4: Group into logical units

This is the core judgment call. Group changes into logical units using a smart hybrid approach:

**Primary grouping: by logical change.** Changes that work together to accomplish one thing belong in one commit. Examples:
- A new API endpoint + its tests + its types = one commit
- A database migration + the model changes that use it = one commit
- A config file change that enables a feature + the feature code = one commit

**Secondary split: separate standalone concerns.** If there are changes that are genuinely independent, split them out:
- Pure refactoring that touches many files but changes no behavior → separate commit
- CI/CD changes unrelated to the feature → separate commit
- Documentation updates that aren't tied to a specific code change → separate commit
- Dependency updates → separate commit

**Don't over-split.** 2-4 commits is ideal for most feature branches. If you're proposing 7+ commits, you're probably splitting too fine — the user came here because they had too many commits. But if the branch genuinely contains 5 independent changes, 5 commits is right.

**Don't under-split either.** If the branch adds a feature, fixes an unrelated bug, and updates CI, those are 3 separate concerns and should be 3 commits, not 1.

### Step 4: Preserve important metadata

While analyzing, collect:
- **Co-authors**: unique `Co-authored-by:` trailers and distinct author emails from `git log --format="%ae" <base>..<branch>`
- **Issue references**: `#123`, `PROJ-456`, any ticket identifiers mentioned in commit messages
- **Breaking changes**: any commit message containing `BREAKING CHANGE:` or `!:` (Conventional Commits breaking change syntax)
- **Signed-off-by**: `Signed-off-by:` trailers (DCO compliance)

These must survive into the final commit messages.

---

## Phase 4: Propose the Plan

Present a clear before/after to the user. This is the most important step — never skip it. Read `references/proposal-format.md` for the full template and examples of how to handle user feedback (combine, reword, re-split).

Always include: branch name, base, commit count reduction, convention used, all current commits (truncate if >10), each proposed commit with complete message and trailers, and a safety check (file count + line count unchanged). Wait for explicit confirmation.

---

## Phase 5: Execute the Rewrite

Only after explicit confirmation.

### Create a backup ref

Before rewriting, save the current state:

```bash
git branch git-squash-backup/<branch-name> <branch>
```

Tell the user: "I've saved a backup at `git-squash-backup/<branch-name>` in case you need to restore."

### Perform the squash

Use `git reset --soft` + targeted commits to create the new history:

```bash
# Save the current tree state
git checkout <branch>

# Reset to the base, keeping all changes staged
git reset --soft <base>

# Now create the new commits in order
# For each proposed commit, stage only its files and commit
```

For multi-commit squashes (where you're creating 2+ commits from the squash), you need to be more precise:

1. `git reset --soft <base>` — all changes are now staged
2. `git reset HEAD .` — unstage everything
3. For each proposed commit group:
   - `git add <files in this group>`
   - `git commit -m "<message>"`

If file-level grouping isn't granular enough (e.g., two logical changes touch the same file), use `git add -p` equivalent approach or split by hunks. In practice, this is rare — if two concerns are tangled in the same file, they usually belong in the same commit anyway.

### Write the commit messages

Follow the convention detected in Phase 2. Each message should have:

1. **Subject line**: imperative mood, concise, within length limits
2. **Blank line**
3. **Body** (if the change warrants explanation): what and why, not how
4. **Trailers**: Co-authored-by, Refs, BREAKING CHANGE, Signed-off-by — whatever was collected in Phase 3

---

## Phase 6: Verify

After rewriting, confirm nothing was lost:

```bash
# Compare the tree state before and after
git diff git-squash-backup/<branch-name>..<branch>
```

This diff should be **empty**. If it's not, something went wrong — alert the user immediately and offer to restore from the backup.

Also show a summary:

```
## Done!

**Before:** 14 commits
**After:** 3 commits
**Backup:** git-squash-backup/feature/auth-system

Diff check: ✓ No code changes — history only.

To push this branch (force push required):
  git push --force-with-lease origin feature/auth-system

To restore the original history if needed:
  git checkout feature/auth-system
  git reset --hard git-squash-backup/feature/auth-system
```

Never auto-push. Always show the command and let the user decide.

---

## Edge Cases

**Merge commits on the branch:** If the branch contains merge commits, warn the user that the squash will linearize the history. This is almost always fine, but mention it.

**Binary files:** These can't be meaningfully diffed. Note them in the proposal ("Commit 2 includes 3 binary files: logo.png, favicon.ico, font.woff2") but don't try to describe their content.

**Submodule pointer changes:** Submodule updates show up as single-line hash changes but are semantically different from code changes. Call them out explicitly in the proposal: "This commit includes a submodule update for `libs/shared` (abc1234 → def5678)."

**Empty commits:** Drop them silently. They add no value.

**Conflicts during reset:** If the reset/re-commit process fails, restore from backup immediately and tell the user what happened.

**User wants to abort mid-way:** If the user changes their mind during Phase 5, restore from the backup ref and confirm the branch is back to its original state.

**Untracked or uncommitted changes:** Before starting, check `git status`. If there are uncommitted changes, tell the user to commit or stash them first. Don't proceed with a dirty working tree — it makes recovery harder if something goes wrong.

**Duplicate/cherry-picked commits:** If the branch was partially rebased or has cherry-picks, some commits may exist on both the base and the branch (same patch, different hash). Detect these with `git cherry <base> <branch>` — lines starting with `-` indicate commits already present on the base. Exclude them from the squash and note: "Skipped N commits that are already on `<base>`."

**Hook failures during rewrite:** If a pre-commit or commit-msg hook rejects a commit during Phase 5, immediately restore from the backup ref. Then inform the user and offer two paths: fix the hook issue, or re-run with `--no-verify` (safe in this context since the code is unchanged — only history is being rewritten).

---

## Tone

Be direct and informative. You're a tool helping them clean up, not a lecturer on git best practices. Show the plan clearly, execute precisely, verify thoroughly. Don't editorialize about their messy commit history — they already know, that's why they're here.
