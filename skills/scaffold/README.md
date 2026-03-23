# scaffold

Scaffold a full-stack JavaScript/TypeScript project — like `create-next-app` but for the entire stack.

## Install

**Claude Code:**
```bash
/plugin marketplace add alainbrown/skills
/plugin install scaffold@alainbrown-skills
```

**Skills CLI:**
```bash
npx skills add alainbrown/skills --skill scaffold
```

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
