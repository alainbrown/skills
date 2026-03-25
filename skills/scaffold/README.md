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
- **Docker Compose for local dev** — generates a compose file with real database/cache instances, hot reloading, and no `.env` files to manage
- **No `.env` files** — local env vars live in Docker Compose, production env vars go on the deployment platform
- **Existing project support** — detects `package.json` in the current directory and skips bootstrap, wiring integrations into your existing structure
- **Package manager detection** — infers from lockfiles or recommends pnpm
- **Connected boilerplate** — wiring isn't isolated examples; the ORM exports a `db` instance that API routes import, auth middleware protects routes, webhooks are handled
- **Deployment setup** — checks for the platform CLI, adds a deploy script, and lists which env vars to configure on the platform

## Edge cases handled

- Target directory already exists (warns before overwriting)
- Scaffold CLI flags change between versions (checks current docs before running)
- User changes a decision after confirming (cascading invalidation with rationale-based dependency checks)
- User cancels a revision mid-change (restores previous decision)
- No Docker available (falls back to native setup without prescribing a mechanism)

## Eval results

**Skill win rate: 63% (15/24 total), ~88% on testable criteria. Baseline wins: 0/24.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| saas-from-scratch | 4/8 | 4/8 | 0/8 |
| mid-flow-change | 5/8 | 3/8 | 0/8 |
| existing-project | 6/8 | 2/8 | 0/8 |

Rubric criteria: opinionated recommendations, decision table UX, cascading invalidation, connected boilerplate, Docker Compose setup, no .env files, existing project detection, reference structure.

Note: 5 of 9 ties are from criteria not testable in a given eval (cascade only applies to mid-flow, existing-project only to existing-project eval). Testable win rates: saas 80%, mid-flow 100%, existing-project 86%.

### Where the skill dominates

- **Decision table UX** (3/3 wins) — structured table with status indicators and drill-by-number. Baseline uses conversational Q&A.
- **No .env files** (2/2 testable wins) — local env in Docker Compose, production on platform. Baseline creates .env.local or .env.example every time.
- **Docker Compose** (2/2 testable wins) — app + infra services with healthchecks, named volumes, env inline. Baseline either omits or provides minimal compose.
- **Cascading invalidation** (1/1 testable win) — formally tracks rationale dependencies, resets affected stages, walks through re-decision. Baseline does ad-hoc change analysis.
- **Existing project detection** (1/1 testable win) — explicitly detects package.json, skips bootstrap, scopes the table to relevant categories.

### Where the baseline holds up

- **Connected boilerplate** (1/3 tie) — for well-specified SaaS projects, baseline produces comparable connected code (tRPC, org-scoped middleware, plan gating).
