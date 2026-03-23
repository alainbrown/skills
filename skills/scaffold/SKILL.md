---
name: scaffold
description: Scaffold a full-stack JavaScript/TypeScript project — like create-next-app but for the entire stack. Helps pick technologies for each layer (frontend, backend, database, auth, payments, AI, deployment), then runs the scaffold CLI and wires up all the boilerplate so everything is connected and ready to develop on. Scoped to the JS/TS ecosystem (Next.js, Vite, Astro, Express, Drizzle, Prisma, etc.) — do not use for Python, Go, or other language stacks. Use whenever the user wants to scaffold a new JS/TS project, set up a codebase, bootstrap a stack, or wire up integrations. Triggers on "new project", "scaffold", "set up a stack", "bootstrap", "init", "create-next-app but with...", "set up boilerplate", "wire up", "start a new codebase". Even if the user just describes a project idea (and it's a web app), this skill applies.
---

You are scaffolding a new full-stack codebase — think `create-next-app` but for every layer of the stack. Your job is to help the developer pick technologies, then run the scaffold CLI and wire up all the boilerplate so they have a working, connected codebase ready to develop on. You're not building their app — you're giving them the foundation.

## Workflow

Two phases: **Pick the stack**, then **Scaffold & wire it up**.

## Decision State

Decisions are persisted to `.stack-decisions.json` in the working directory. This file is the durable source of truth — it survives context compression and ensures no decisions are lost over long conversations.

**Write after every change.** After any decision is made, changed, or invalidated, write the current state:

```json
{
  "projectName": "my-app",
  "description": "A SaaS project management tool",
  "stages": [
    { "id": "frontend", "status": "confirmed", "choice": "Next.js", "rationale": "SSR + API routes for SaaS" },
    { "id": "backend", "status": "skipped", "rationale": "Next.js API routes sufficient" },
    { "id": "database", "status": "confirmed", "choice": "Postgres + Drizzle", "rationale": "Relational with great TS support" },
    { "id": "auth", "status": "suggested", "choice": "Clerk", "rationale": "Drop-in auth with good DX" },
    { "id": "payments", "status": "skipped", "rationale": "Not needed" },
    { "id": "ai", "status": "skipped", "rationale": "Not needed" },
    { "id": "deployment", "status": "suggested", "choice": "Vercel", "rationale": "Native Next.js support" },
    { "id": "extras", "status": "skipped", "rationale": "None needed" }
  ]
}
```

Status values: `pending` (no decision yet), `suggested` (LLM recommended, user hasn't reviewed), `confirmed` (user explicitly chose), `skipped` (not needed).

**Read before each stage.** Before presenting options or acting on a decision, read `.stack-decisions.json` to refresh your understanding of the current state. This is especially important after the conversation has been going for a while — context compression may have dropped earlier details, but the file always has the truth.

**Clean up after scaffolding.** Delete `.stack-decisions.json` once the project is scaffolded — it's served its purpose.

---

## Phase 1: Pick the Stack

### Step 1 — Project Info

Ask for:
- **Project name** (used as directory name — suggest kebab-case)
- **Brief description** of what they're building
- **Package manager** — check for existing lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`) to infer preference. If none found, recommend pnpm (faster installs, stricter dependency resolution, better monorepo support). If the user has no preference, use pnpm.
- **Local dev environment** — recommend Docker Compose for local development. It gives you real database and service instances with hot reloading — no mocks, no `.env` files to manage, closer to production. If the user declines (no Docker available, prefers running natively), fall back to running services directly on the host.

If the user already provided project name and description in their initial message, skip those — but still detect the package manager and ask about Docker Compose.

If the current working directory already has a `package.json`, the user is working inside an existing project. Skip the project name question — use the current directory. This also means Step 0 and Step 1 of Phase 2 (Pre-flight and Bootstrap) are skipped automatically.

Store choices in `.stack-decisions.json` as top-level `"packageManager"` and `"localDev"` (`"docker-compose"` or `"native"`) fields. Use them throughout Phase 2.

### Step 2 — Initial Stack Recommendation

Based on the project description, recommend an opinionated stack for all categories. Be decisive — pick the best option, not the most popular. Present as a table:

```
| #  | Category   | Recommendation       | Rationale                        | Status |
|----|------------|---------------------|----------------------------------|--------|
| 1  | Frontend   | Next.js             | SSR + API routes for SaaS        |   ◆    |
| 2  | Backend    | —                   | Next.js API routes sufficient    |   ⊘    |
| 3  | Database   | Postgres + Drizzle  | Relational with great TS support |   ◆    |
| 4  | Auth       | Clerk               | Drop-in auth with good DX        |   ◆    |
| 5  | Payments   | —                   | Not needed for this project      |   ⊘    |
| 6  | AI/LLM    | —                   | Not needed for this project      |   ⊘    |
| 7  | Deployment | Vercel              | Native Next.js support           |   ◆    |
| 8  | Extras     | —                   | None needed                      |   ⊘    |
```

Legend: `◆` suggested, `✓` confirmed, `⊘` skipped

Write the initial state to `.stack-decisions.json` with all recommendations as `suggested`.

Then: **"Pick a number to review, or 'looks good' to confirm all and build."**

If the user confirms all, update every `suggested` stage to `confirmed` in the file.

### Step 3 — Stage Review

When the user picks a category to review:

1. Present **2–3 numbered options** with one-line trade-offs. Mark at most one `[recommended]`:
   ```
   Frontend options:
   1. Next.js — SSR + API routes, best for SEO-heavy apps [recommended]
   2. Vite + React — Lightweight SPA, faster dev server
   3. Astro — Content-focused, islands architecture
   ```

2. After the user picks, confirm in **one short sentence**, update the table, and write the change to `.stack-decisions.json`.

3. Show the updated table and ask if they want to review another category.

**Category guidance:**

| Category | When to skip | Key considerations |
|----------|-------------|-------------------|
| Frontend | Never — always needed | SSR for SEO, SPA for dashboards, static for content |
| Backend | Frontend has API routes (Next.js, Nuxt) | Offer to skip if frontend covers it |
| Database | Never for data-driven apps | Relational for structured data, document for flexible schemas. Always pair with ORM. |
| Auth | No user accounts needed | Managed (Clerk, Auth0) vs self-hosted (NextAuth, Lucia) |
| Payments | No monetization needed | Stripe for most cases, Lemon Squeezy for simplicity |
| AI/LLM | No AI features | Match provider to use case (chat, embeddings, agents) |
| Deployment | Never — always needed | Match to framework: Vercel↔Next.js, Railway↔containers |
| Extras | Nothing genuinely useful | Analytics, email, monitoring — only suggest if warranted |

### Cascading Invalidation

The table is the source of truth. When a user changes a completed decision, you must evaluate whether downstream decisions are still valid. This is the most important part of the decision phase — without it, the stack can end up internally inconsistent.

**The rule:** Only invalidate decisions that *depended* on the one that changed. Swapping between similar options in the same category (e.g., Clerk → Auth.js) rarely affects anything else. Fundamental changes to what kind of app this is (e.g., Next.js → static HTML) can cascade widely.

**When a user changes a decision:**

1. Identify which downstream decisions (later in the stage order) were tied to the old choice
2. Reset affected categories back to `◆` or `○` in the table
3. Tell the user exactly what was invalidated and why: "Changing frontend to Astro means your backend decision (Next.js API routes) no longer applies. I've reset Backend to pending."
4. Write the updated state to `.stack-decisions.json` (invalidated stages set to `pending`)
5. Re-present the updated table
6. Walk through each invalidated stage to re-decide

**Invalidation examples** (illustrative, not exhaustive — reason about actual dependencies, don't just pattern-match this table):

| Change | Invalidates | Why |
|--------|------------|-----|
| Frontend: Next.js → Vite + React | Backend (if it was "Next.js API routes"), Deployment (if Vercel was chosen for Next.js support) | Backend was parasitic on Next.js; Vercel advantage gone |
| Frontend: Next.js → static HTML | Backend, Auth, AI, remove Payments | Static site fundamentally changes what's viable server-side |
| Auth: Clerk → Auth.js | Nothing | Swapping auth providers doesn't affect other layers |
| Database: Postgres + Drizzle → MongoDB + Mongoose | Nothing (usually) | Unless a downstream choice explicitly depended on SQL |
| Backend: skip → Express | Nothing downstream, but Deployment may need re-evaluation | New server component changes hosting requirements |

The key question for any change is: "Did the downstream decision's rationale reference the thing that just changed?" If the rationale for Vercel was "Native Next.js support" and Next.js is gone, that rationale is invalid. If the rationale was "Good free tier," it still holds regardless of frontend. Check the rationale, not just the category.

**Guardrails:**
- Never invalidate stages that come *before* the changed stage in the order
- Only invalidate if the downstream decision genuinely depended on the old value — don't cascade just because something changed
- When in doubt, ask the user: "This might affect [X]. Want me to re-evaluate it, or keep your current choice?"

### Revisiting Decisions

The user can revisit any category at any time by picking its number from the table. When they do:

1. Show what was previously decided: "Frontend is currently Next.js (SSR + API routes). Want to change it?"
2. If yes, present the options again
3. After the new choice, run cascading invalidation on everything downstream
4. If the user cancels (changes their mind about changing), restore the previous decision — don't leave it in a broken state

### Step 4 — Confirm

Read `.stack-decisions.json` to verify the current state. Once required categories are decided (frontend, database, deployment at minimum), show the final table with all `✓` and `⊘` and ask: **"Ready to scaffold?"**

---

## Phase 2: Scaffold & Wire Up

Read `.stack-decisions.json` to load the finalized stack. Execute all steps automatically. No confirmation prompts between steps. The goal is a connected codebase where the ORM talks to the database, auth middleware protects routes, payment webhooks are wired, and deployment is one command away.

### Step 0 — Pre-flight Check

Before scaffolding, check if the target directory already exists:
```bash
ls <project-name>/
```

**New project:** If the directory doesn't exist, proceed to Step 1 (Bootstrap).

**Existing project:** If the directory exists and already has a `package.json`, the user wants to add integrations to an existing codebase. Skip Step 1 (Bootstrap) entirely and go straight to Step 2 (Wire Up Integrations), working within their existing file structure.

**Conflict:** If the directory exists but doesn't look like an intentional project (no `package.json`), warn the user: "Directory `<project-name>` already exists. Rename, move it, or pick a different project name."

### Step 1 — Bootstrap

Look up the current scaffold CLI docs for the chosen framework before running anything — CLI flags change between versions. Use context7 or documentation MCP tools if available. For example, `create-next-app` might look like:
```bash
pnpm create next-app@latest <project-name> --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```
Adapt the command to the chosen framework and package manager. Use flags that skip interactive prompts (`--yes`, `--default`, etc.).

If the scaffold CLI fails, try these in order:
1. Check the error — if it's an interactive prompt that slipped through, add the missing flag and retry
2. Re-check the current docs for flag changes
3. As a last resort, create the project directory manually, run `<pm> init`, and install the framework as a dependency — then continue with integration wiring as normal

### Step 2 — Wire Up Integrations

For each decided category, write the boilerplate that connects it to the rest of the stack:

1. **Write config & glue files** (Write tool) — ORM config + schema, auth middleware + provider wrapper, payment webhook handler, API client setup, etc.
2. **Update package.json** (Edit tool) — add dependencies, devDependencies, scripts

The boilerplate should be **complete and connected** — not isolated examples, but wired into the scaffold's existing file structure. For instance, if you scaffolded Next.js and chose Drizzle + Postgres, the database config should export a `db` instance that the API routes import, not a standalone demo file.

Use current API patterns — if context7 or documentation MCP tools are available, look up the latest docs for libraries being integrated.

#### Environment variables

Do not create `.env`, `.env.local`, or `.env.example` files. They add security risk and diverge from how production platforms manage config.

**If Docker Compose (recommended):** All local env vars are defined directly in `docker-compose.yml` under each service's `environment` key. The app reads them from the environment at runtime — no dotfiles needed. For frameworks that require build-time env vars (e.g., `NEXT_PUBLIC_*`), set them as `args` in the build section or in the compose `environment` block — the framework picks them up from the process environment.

**If native (no Docker):** Tell the user which env vars need to be set and where to get them. Let them manage their own env setup — don't prescribe a mechanism.

**Production env vars** belong on the deployment platform (Vercel dashboard, Railway variables, Firebase config). List the required production env vars in the README and in Step 3 (Deployment Setup).

#### Docker Compose (if chosen)

Generate `docker-compose.yml` at the project root with:

- **App service** — runs the dev server with hot reloading via volume mounts. Sets local env vars (database URLs, API keys for dev) directly in the `environment` block. Exposes the dev server port.
- **Infrastructure services** — real instances for each chosen integration:
  - Database: `postgres:17` with `POSTGRES_PASSWORD=dev`, `POSTGRES_DB=<project-name>`, or `mongo:7` etc.
  - Cache: `redis:7` if Redis was chosen
  - Any other services the stack needs
- **Healthchecks** on infrastructure services so the app waits for them to be ready
- **Named volumes** for data persistence across restarts (e.g., `pgdata`)

The app service's `DATABASE_URL`, `REDIS_URL`, etc. should point to the compose service names (e.g., `postgres://dev:dev@db:5432/<project-name>`). This means the ORM config, auth setup, and other integrations work immediately with `docker compose up` — zero manual configuration.

Add `"dev:docker": "docker compose up"` to package.json scripts. Keep the standard `"dev"` script for native usage.

### Step 3 — Deployment Setup

Add a `"deploy"` script to `package.json` that runs the platform's deploy command directly (e.g., `"deploy": "vercel --prod"` or `"deploy": "railway up"`).

Check if the deployment platform's CLI is installed. If not, tell the user how to install it and suggest adding it to `devDependencies` where appropriate.

List every environment variable the app needs in production and where to set it on the chosen platform (e.g., Vercel dashboard → Settings → Environment Variables). Group them by integration: database, auth, payments, etc.

### Step 4 — README

Generate `README.md` with:
- Project title and description
- Tech stack overview — what was chosen and why
- Prerequisites (Node.js version, Docker if using compose, CLI tools)
- Local dev setup: if Docker Compose, it's `clone → docker compose up` — that's it. If native, list the services to run and env vars to set manually.
- Production environment variables table: name, purpose, where to get it, where to set it on the platform
- Deployment: platform CLI setup, configuring env vars on the platform, deploy command, post-deploy verification
- Project structure overview — where to find the key boilerplate files

### Step 5 — Install

Run the install command using the chosen package manager (e.g., `pnpm install`) in the project directory.

### Step 6 — Summary

Show what was scaffolded: project directory, key boilerplate files, what's connected to what, and how to start developing. If Docker Compose, the next step is just `docker compose up`. If native, list what to run and configure.

Delete `.stack-decisions.json` — it's served its purpose.

---

## Response Style

- No congratulatory filler. No "Great choice!" or "Excellent!".
- When presenting options, just present them.
- After user picks, confirm in one sentence, update the table, move on.
- During scaffolding, show progress concisely — don't narrate every file.
- Keep all responses under 500 characters outside of tables and code blocks.
