# Proposal Format

Present a clear before/after to the user. This is the most important step — never skip it.

## Template

```
## Squash Plan

**Branch:** feature/auth-system
**Base:** main (14 commits → 3)
**Convention:** Conventional Commits (detected from commitlint config)

### Current commits (14):
1. wip auth
2. fix typo
3. more auth stuff
4. add tests maybe
5. actually fix tests
6. ...
[truncate if >10, show first 5 and last 5 with "..." in between]

### Proposed commits (3):

**Commit 1:**
```
feat(auth): add JWT authentication system

Implement token-based authentication with refresh token rotation.

- Add auth middleware for route protection
- Create login/register endpoints
- Add token refresh and revocation logic

Refs: #142, #156
Co-authored-by: Jane <jane@example.com>
```

**Commit 2:**
```
test(auth): add authentication test suite

- Unit tests for token generation and validation
- Integration tests for login/register flow
- Edge case coverage for expired and revoked tokens
```

**Commit 3:**
```
ci: add auth service to CI pipeline

- Add JWT_SECRET to CI environment
- Add auth integration test job
```

### Safety check:
- Files changed: 23 (same before and after)
- Lines: +892, -34 (same before and after)
- No code will be lost — only commit history changes.

**Does this look good? I'll proceed once you confirm. Feel free to suggest changes to the grouping or messages.**
```

## Adjusting based on feedback

The user might say:
- "Combine commits 1 and 2" → merge them
- "The message for commit 1 should mention the refresh token rotation more prominently" → rewrite
- "Actually split the middleware into its own commit" → re-split
- "Looks good" / "Go ahead" → proceed to Phase 5

Iterate until they're happy.
