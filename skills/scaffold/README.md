# scaffold

Scaffold a full-stack JavaScript/TypeScript project — like `create-next-app` but for the entire stack.

## Usage

```
I want to build a SaaS project management tool
```
```
scaffold a blog with Astro and a CMS
```
```
add auth and a database to this project
```
```
new project — real-time multiplayer game lobby
```

## What it does

Helps you pick technologies for each layer of your stack (frontend, backend, database, auth, payments, AI, deployment), then runs the scaffold CLI and wires up all the boilerplate so everything is connected and ready to develop on. Works for new projects and existing codebases.

## Features

- **Opinionated stack recommendations** — presents a decision table with rationale for each choice, then lets you drill into any category to review alternatives
- **Decision persistence** — tracks all decisions in `.stack-decisions.json` so nothing is lost over long conversations
- **Cascading invalidation** — changing a decision automatically re-evaluates downstream choices that depended on it
- **Cross-integration wiring** — every integration touches every other relevant integration, not just coexists. Auth webhooks sync to DB, checkout reads DB users, protected routes check subscription status from DB
- **Wiring completeness checklist** — verifies all cross-cutting connections after scaffolding
- **Docker Compose for local dev** — generates a compose file with real database/cache instances, hot reloading, and no `.env` files to manage
- **No `.env` files** — local env vars live in Docker Compose, production env vars go on the deployment platform
- **Existing project support** — detects `package.json` in the current directory and skips bootstrap, wiring integrations into your existing structure
- **Package manager detection** — infers from lockfiles or recommends pnpm
- **Connected boilerplate** — wiring isn't isolated examples; the ORM exports a `db` instance that API routes import, auth middleware protects routes, webhooks are handled
- **Separate integration tables** — DB schema models relationships between integrations with foreign keys (e.g., `subscriptions` table with `userId` FK, not subscription columns on the user model)
- **Deployment setup** — checks for the platform CLI, adds a deploy script, and lists which env vars to configure on the platform
- **Reference files** — stable patterns (Docker Compose templates, wiring patterns) are split into reference files for consistency

## Edge cases handled

- Target directory already exists (warns before overwriting)
- Scaffold CLI flags change between versions (checks current docs before running)
- User changes a decision after confirming (cascading invalidation with rationale-based dependency checks)
- User cancels a revision mid-change (restores previous decision)
- No Docker available (falls back to native setup without prescribing a mechanism)
- All categories populated (kitchen-sink scenario stays organized with wiring matrix)
- Multiple rapid changes (handles 3+ cascading invalidations in sequence without residual artifacts)

## Test scenarios

| Eval | Prompt | What it tests |
|------|--------|---------------|
| saas-from-scratch | "Build a SaaS habit tracker with team features" | Full new project flow, all core integrations |
| mid-flow-change | "Next.js recipe site... actually Vite SPA instead" | Cascading invalidation when frontend changes |
| existing-project | "Add auth, database, and payments to this Next.js app" | Existing project detection, scoped wiring |
| kitchen-sink | "Team collab tool with auth, DB, payments, AI, email, file storage" | 6+ integrations, high complexity organization |
| contradictory-change | "Next.js + Stripe... make it Astro, add backend, switch to Lemon Squeezy" | 3 rapid cascading changes in sequence |

## Eval results

**Skill win rate: 83% (33/40 total). Testable win rate: 100% (33/33). Baseline wins: 0/40.**

Prior eval: 63% (15/24). Improvement driven by adding reference files for wiring patterns and Docker Compose templates.

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| saas-from-scratch | 6/8 | 2/8 | 0/8 |
| mid-flow-change | 7/8 | 1/8 | 0/8 |
| existing-project | 7/8 | 1/8 | 0/8 |
| kitchen-sink | 6/8 | 2/8 | 0/8 |
| contradictory-change | 7/8 | 1/8 | 0/8 |

Rubric criteria: opinionated recommendations, decision table UX, cascading invalidation, connected boilerplate, Docker Compose setup, no .env files, existing project detection, reference structure.

All 7 ties are from criteria not testable in a given eval (cascade only applies to mid-flow/contradictory, existing-project detection only to existing-project eval).

### Where the skill dominates

- **Decision table UX** (5/5 wins) — structured table with status indicators and drill-by-number. Baseline uses conversational Q&A.
- **No .env files** (5/5 wins) — local env in Docker Compose, production on platform. Baseline creates .env.local or .env.example every time.
- **Docker Compose** (5/5 wins) — template-based compose with app + infra services, healthchecks, named volumes. Baseline either omits or provides minimal compose.
- **Connected boilerplate** (5/5 wins) — cross-integration wiring with requireDbUser() helper, separate subscriptions table, subscription-gated routes reading DB. Baseline produces comparable but less thorough connections.
- **Reference structure** (5/5 wins) — wiring-patterns.md and docker-compose-templates.md ensure consistent, thorough output.
- **Cascading invalidation** (2/2 testable wins) — formal rationale-based dependency tracking with table evolution. Handles 3 rapid changes systematically.
- **Existing project detection** (1/1 testable win) — detects package.json, skips bootstrap, scopes table.
- **Opinionated recommendations** (5/5 wins) — decisive picks with rationale vs baseline's exploratory questioning.

### Where the baseline holds up

No criteria where the baseline matches or beats the skill on testable evals.
