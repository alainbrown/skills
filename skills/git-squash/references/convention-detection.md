# Convention Detection

Check these sources in priority order — the first one that yields a clear convention wins.

## Priority 1: commitlint configuration

Look for any of these files in the repo root:
- `commitlint.config.js` / `.ts` / `.mjs` / `.cjs`
- `.commitlintrc` / `.commitlintrc.json` / `.commitlintrc.yml` / `.commitlintrc.yaml`
- `commitlint` key in `package.json`

If found, read the config and extract the rules — especially `type-enum` (allowed types), `scope-enum` (allowed scopes), `header-max-length`, and `subject-case`. These are your hard constraints.

## Priority 2: .gitmessage template

Check `git config commit.template` and look for `.gitmessage` in the repo root. If found, read it to understand the expected structure (e.g., a subject line, blank line, body, trailers).

## Priority 3: CONTRIBUTING.md and related docs

Read `CONTRIBUTING.md`, `CONTRIBUTING`, `.github/CONTRIBUTING.md`, or `docs/CONTRIBUTING.md` if any exist. Look for sections about commit messages, commit conventions, or PR guidelines. Extract any formatting rules.

Also check `.github/pull_request_template.md` — it sometimes hints at commit conventions.

## Priority 4: Git history patterns

If no explicit config was found, analyze the last 30 commits on the base branch:

```
git log --oneline -30 <base>
```

Look for patterns:
- **Conventional Commits**: `feat:`, `fix:`, `chore:`, etc.
- **Ticket prefixes**: `[PROJ-123]`, `JIRA-456:`
- **Emoji prefixes**: `:sparkles:`, `:bug:`
- **Scope patterns**: `feat(auth):`, `fix(api):`
- **Casing**: sentence case, lowercase, title case

If 60%+ of commits follow the same pattern, adopt it. If the history is inconsistent or there aren't enough commits to establish a pattern, fall back.

## Priority 5: Conventional Commits (default)

If nothing above yields a clear convention, use Conventional Commits:

```
<type>(<optional scope>): <description>

<optional body>

<optional footer(s)>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`, `ci`, `build`

## Presenting findings

**In Interactive mode:** Present what you found and let the user decide. Don't silently adopt a convention — the user might disagree with it or want something different.

**In Auto mode:** Use the highest-priority detected convention (or Conventional Commits as fallback). Skip the choice prompt. Briefly note which convention was selected in the proposal (Phase 4) so the user can see what was chosen and object if needed.

**When one clear convention is found:**

```
## Commit Convention

I found a commitlint config enforcing Conventional Commits with these scopes:
`api`, `web`, `shared`, `ci`

- **A) Use this convention** (recommended — matches repo config)
- **B) Use Conventional Commits without scope restrictions**
- **C) Something else** (describe what you want)
```

**When multiple conflicting signals are found:**

```
## Commit Convention

I found mixed signals:
- CONTRIBUTING.md says: "Use ticket prefix format: [PROJ-XXX] description"
- Git history (last 30 commits): 70% use Conventional Commits, 30% use ticket prefixes

- **A) Ticket prefix** (matches CONTRIBUTING.md)
- **B) Conventional Commits** (matches recent history)
- **C) Something else**
```

**When nothing is found:**

```
## Commit Convention

No commit conventions detected in this repo (no commitlint, .gitmessage,
CONTRIBUTING.md guidance, or consistent history pattern).

- **A) Use Conventional Commits** (recommended — widely adopted standard)
- **B) Simple format** (just a clear subject line, no type prefix)
- **C) Something else** (describe what you want)
```

Wait for the user's choice before proceeding. If they pick C, ask them to describe or show an example of the format they want.
