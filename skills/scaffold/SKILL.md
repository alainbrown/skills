---
name: scaffold
description: Scaffold a full-stack JavaScript/TypeScript project — like create-next-app but for the entire stack. Helps pick technologies for each layer (frontend, backend, database, auth, payments, AI, deployment), then runs the scaffold CLI and wires up all the boilerplate so everything is connected and ready to develop on. Scoped to the JS/TS ecosystem (Next.js, Vite, Astro, Express, Drizzle, Prisma, etc.) — do not use for Python, Go, or other language stacks. Use whenever the user wants to scaffold a new JS/TS project, set up a codebase, bootstrap a stack, or wire up integrations. Triggers on "new project", "scaffold", "set up a stack", "bootstrap", "init", "create-next-app but with...", "set up boilerplate", "wire up", "start a new codebase". Even if the user just describes a project idea (and it's a web app), this skill applies.
---

# Scaffold

<purpose>
Scaffold a full-stack JavaScript/TypeScript codebase — technology selection through every layer,
then CLI bootstrap and integration wiring so the developer has a connected, working foundation.
Not building their app — giving them the foundation to build on.
</purpose>

<core_principle>
**Durable state via `.stack-decisions.json`.** This file survives context compression and ensures
no decisions are lost over long conversations.

- **Write after every change.** After any decision is made, changed, or invalidated, write the
  current state.
- **Read before each step.** Before presenting options or acting on a decision, read
  `.stack-decisions.json` to refresh context — especially important after context compression.
- **Clean up when done.** Delete `.stack-decisions.json` after the project is scaffolded.

Schema:

```json
{
  "projectName": "my-app",
  "description": "A SaaS project management tool",
  "packageManager": "pnpm",
  "localDev": "docker-compose",
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

Status values: `pending` (no decision yet), `suggested` (LLM recommended, user hasn't reviewed),
`confirmed` (user explicitly chose), `skipped` (not needed).
</core_principle>

## Workflow Overview

```
  Pick the Stack                    Scaffold & Wire Up
  ─────────────                     ──────────────────
  ┌─────────────────┐               ┌─────────────────┐
  │ gather_info      │               │ preflight        │
  └──────┬──────────┘               └──────┬──────────┘
         ↓                                 ↓
  ┌─────────────────┐               ┌─────────────────┐
  │ recommend_stack  │               │ bootstrap        │
  └──────┬──────────┘               └──────┬──────────┘
         ↓                                 ↓
  ┌─────────────────┐               ┌─────────────────┐
  │ review_choices   │◄─┐           │ wire_integrations│
  └──────┬──────────┘  │           └──────┬──────────┘
         ↓              │                  ↓
  ┌─────────────────┐  │           ┌─────────────────┐
  │ confirm_stack    │──┘           │ setup_deployment │
  └──────┬──────────┘               └──────┬──────────┘
         ↓                                 ↓
         └──────────────┐           ┌─────────────────┐
                        └──────────→│ finalize         │
                                    └─────────────────┘
```

<process>

<!-- ═══════════════════════════════════════════ -->
<!-- PHASE 1: PICK THE STACK                    -->
<!-- ═══════════════════════════════════════════ -->

<step name="gather_info">
**Collect project identity and environment preferences.**

Ask for:
- **Project name** (used as directory name — suggest kebab-case)
- **Brief description** of what they're building
- **Package manager** — check for existing lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`)
  to infer preference. If none found, recommend pnpm (faster installs, stricter dependency
  resolution, better monorepo support). If the user has no preference, use pnpm.

Ask via AskUserQuestion:
- header: "Local dev?"
- question: "Use Docker Compose for local development? Gives you real database instances with hot reloading."
- options:
  - "Use Docker" — real services, zero manual config
  - "Run native" — no Docker, services on host directly
  - "Let me explain" — freeform input

If the user already provided project name and description in their initial message, skip
those — but still detect the package manager and ask about Docker Compose.

### Existing project detection

If the current working directory already has a `package.json`, the user is working inside an
existing project. Skip the project name question — use the current directory. The `preflight`
and `bootstrap` steps are skipped automatically in Phase 2.

Store choices in `.stack-decisions.json` as top-level `"packageManager"` and `"localDev"`
(`"docker-compose"` or `"native"`) fields.

▶ Next: `recommend_stack`
</step>

<step name="recommend_stack">
**Propose an opinionated stack for all categories based on the project description.**

Be decisive — pick the best option, not the most popular. Present as a table:

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

| Category | When to skip | Key considerations |
|----------|-------------|-------------------|
| Frontend | Never — always needed | SSR for SEO, SPA for dashboards, static for content |
| Backend | Frontend has API routes (Next.js, Nuxt) | Offer to skip if frontend covers it |
| Database | Never for data-driven apps | Relational for structured data, document for flexible schemas. Always pair with ORM. |
| Auth | No user accounts needed | Managed (Clerk, Auth0) vs self-hosted (NextAuth, Lucia) |
| Payments | No monetization needed | Stripe for most cases, Lemon Squeezy for simplicity |
| AI/LLM | No AI features | Match provider to use case (chat, embeddings, agents) |
| Deployment | Never — always needed | Match to framework: Vercel <> Next.js, Railway <> containers |
| Extras | Nothing genuinely useful | Analytics, email, monitoring — only suggest if warranted |

▶ Next: `review_choices`
</step>

<step name="review_choices">
**Let the user drill into any category to see alternatives and pick.**

When the user picks a category to review:

1. Present **2-3 numbered options** with one-line trade-offs. Mark at most one `[recommended]`:
   ```
   Frontend options:
   1. Next.js — SSR + API routes, best for SEO-heavy apps [recommended]
   2. Vite + React — Lightweight SPA, faster dev server
   3. Astro — Content-focused, islands architecture
   ```

2. After the user picks, confirm in **one short sentence**, update the table, and write the
   change to `.stack-decisions.json`.

3. Show the updated table and ask if they want to review another category.

### Cascading invalidation

The table is the source of truth. When a user changes a completed decision, evaluate whether
downstream decisions are still valid.

**The rule:** Only invalidate decisions that *depended* on the one that changed. Swapping
between similar options in the same category (e.g., Clerk -> Auth.js) rarely affects anything
else. Fundamental changes to what kind of app this is (e.g., Next.js -> static HTML) can
cascade widely.

**When a user changes a decision:**

1. Identify which downstream decisions (later in the stage order) were tied to the old choice
2. Reset affected categories back to `◆` or `○` in the table
3. Tell the user exactly what was invalidated and why: "Changing frontend to Astro means your
   backend decision (Next.js API routes) no longer applies. I've reset Backend to pending."
4. Write the updated state to `.stack-decisions.json` (invalidated stages set to `pending`)
5. Re-present the updated table
6. Walk through each invalidated stage to re-decide

**Invalidation examples** (illustrative — reason about actual dependencies, don't just
pattern-match this table):

| Change | Invalidates | Why |
|--------|------------|-----|
| Frontend: Next.js -> Vite + React | Backend (if "Next.js API routes"), Deployment (if Vercel chosen for Next.js) | Backend was parasitic on Next.js; Vercel advantage gone |
| Frontend: Next.js -> static HTML | Backend, Auth, AI, remove Payments | Static site fundamentally changes what's viable server-side |
| Auth: Clerk -> Auth.js | Nothing | Swapping auth providers doesn't affect other layers |
| Database: Postgres + Drizzle -> MongoDB + Mongoose | Nothing (usually) | Unless a downstream choice explicitly depended on SQL |
| Backend: skip -> Express | Nothing downstream, but Deployment may need re-evaluation | New server component changes hosting requirements |

The key question: "Did the downstream decision's rationale reference the thing that just
changed?" If the rationale for Vercel was "Native Next.js support" and Next.js is gone, that
rationale is invalid. Check the rationale, not just the category.

### Revisiting decisions

The user can revisit any category at any time by picking its number. When they do:

1. Show what was previously decided: "Frontend is currently Next.js (SSR + API routes). Want
   to change it?"
2. If yes, present the options again
3. After the new choice, run cascading invalidation on everything downstream
4. If the user cancels, restore the previous decision — don't leave it in a broken state

▶ Next: `confirm_stack`
</step>

<step name="confirm_stack">
**Lock in the final stack before scaffolding.**

Read `.stack-decisions.json` to verify the current state. Once required categories are decided
(frontend, database, deployment at minimum), show the final table with all `✓` and `⊘` and
ask: **"Ready to scaffold?"**

If any required category is still `pending` or `suggested`, prompt the user to confirm or
review it before proceeding.

▶ Next: `preflight`
</step>

<!-- ═══════════════════════════════════════════ -->
<!-- PHASE 2: SCAFFOLD & WIRE UP                -->
<!-- ═══════════════════════════════════════════ -->

<step name="preflight">
**Check the target directory before scaffolding.**

Read `.stack-decisions.json` to load the finalized stack. From this step onward, execute
automatically — no confirmation prompts between steps.

```bash
ls <project-name>/
```

| Situation | Action |
|-----------|--------|
| Directory doesn't exist | Proceed to `bootstrap` |
| Directory exists with `package.json` | Skip `bootstrap`, go to `wire_integrations` (existing project) |
| Directory exists without `package.json` | Warn: "Directory exists. Rename, move it, or pick a different name." |

▶ Next: `bootstrap` (new project) or `wire_integrations` (existing project)
</step>

<step name="bootstrap">
**Run the scaffold CLI for the chosen framework.**

Look up the current scaffold CLI docs for the chosen framework before running anything — CLI
flags change between versions. Use context7 or documentation MCP tools if available. Example:

```bash
pnpm create next-app@latest <project-name> --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Adapt the command to the chosen framework and package manager. Use flags that skip interactive
prompts (`--yes`, `--default`, etc.).

### CLI failure recovery

If the scaffold CLI fails, try these in order:
1. Check the error — if it's an interactive prompt that slipped through, add the missing flag
   and retry
2. Re-check the current docs for flag changes
3. As a last resort, create the project directory manually, run `<pm> init`, and install the
   framework as a dependency — then continue with integration wiring as normal

▶ Next: `wire_integrations`
</step>

<step name="wire_integrations">
**Write the boilerplate that connects every integration to the rest of the stack.**

For each decided category, write config and glue files:

1. **Write config & glue files** (Write tool) — ORM config + schema, auth middleware + provider
   wrapper, payment webhook handler, API client setup, etc.
2. **Update package.json** (Edit tool) — add dependencies, devDependencies, scripts

The boilerplate must be **complete and connected** — not isolated examples, but wired into
the scaffold's existing file structure. If you scaffolded Next.js and chose Drizzle + Postgres,
the database config should export a `db` instance that the API routes import, not a standalone
demo file.

Use current API patterns — if context7 or documentation MCP tools are available, look up the
latest docs for libraries being integrated.

### Environment variables

Do not create `.env`, `.env.local`, or `.env.example` files.

| Local dev mode | Env var strategy |
|----------------|-----------------|
| Docker Compose | All local env vars defined in `docker-compose.yml` under each service's `environment` key. For build-time vars (`NEXT_PUBLIC_*`), set as `args` or in the `environment` block. |
| Native | Tell the user which env vars to set and where to get them. Don't prescribe a mechanism. |
| Production | Env vars belong on the deployment platform. List them in README and `setup_deployment`. |

### Docker Compose (if chosen)

Generate `docker-compose.yml` at the project root with:

- **App service** — dev server with hot reloading via volume mounts. Local env vars directly in
  the `environment` block. Exposes the dev server port.
- **Infrastructure services** — real instances:
  - Database: `postgres:17` with `POSTGRES_PASSWORD=dev`, `POSTGRES_DB=<project-name>`, or
    `mongo:7` etc.
  - Cache: `redis:7` if Redis was chosen
  - Any other services the stack needs
- **Healthchecks** on infrastructure so the app waits for readiness
- **Named volumes** for data persistence across restarts (e.g., `pgdata`)

The app service's `DATABASE_URL`, `REDIS_URL`, etc. should point to compose service names
(e.g., `postgres://dev:dev@db:5432/<project-name>`). ORM config, auth setup, and other
integrations work immediately with `docker compose up` — zero manual config.

Add `"dev:docker": "docker compose up"` to package.json scripts. Keep the standard `"dev"`
script for native usage.

▶ Next: `setup_deployment`
</step>

<step name="setup_deployment">
**Configure deployment for one-command shipping.**

1. Add a `"deploy"` script to `package.json` that runs the platform's deploy command directly
   (e.g., `"deploy": "vercel --prod"` or `"deploy": "railway up"`).

2. Check if the deployment platform's CLI is installed. If not, tell the user how to install it
   and suggest adding it to `devDependencies` where appropriate.

3. List every environment variable the app needs in production and where to set it on the
   chosen platform (e.g., Vercel dashboard -> Settings -> Environment Variables). Group by
   integration: database, auth, payments, etc.

▶ Next: `finalize`
</step>

<step name="finalize">
**Generate README, install dependencies, and present the finished scaffold.**

### README

Generate `README.md` with:
- Project title and description
- Tech stack overview — what was chosen and why
- Prerequisites (Node.js version, Docker if using compose, CLI tools)
- Local dev setup: if Docker Compose, it's `clone -> docker compose up`. If native, list
  services to run and env vars to set manually.
- Production environment variables table: name, purpose, where to get it, where to set it
- Deployment: platform CLI setup, configuring env vars, deploy command, post-deploy verification
- Project structure overview — where to find the key boilerplate files

### Install

Run the install command using the chosen package manager (e.g., `pnpm install`) in the project
directory.

### Summary

Show what was scaffolded: project directory, key boilerplate files, what's connected to what,
and how to start developing. If Docker Compose, the next step is just `docker compose up`.
If native, list what to run and configure.

Delete `.stack-decisions.json` — it's served its purpose.
</step>

</process>

<guardrails>
- NEVER create `.env`, `.env.local`, or `.env.example` files — use Docker Compose environment blocks or tell the user to set vars manually
- NEVER scaffold for Python, Go, or other non-JS/TS stacks — this skill is scoped to the JS/TS ecosystem
- NEVER invalidate stages that come *before* the changed stage in the stage order
- NEVER cascade invalidation unless the downstream decision's rationale genuinely depended on the old value
- NEVER leave the decision table in a broken state — if the user cancels a change, restore the previous decision
- When in doubt about invalidation, ask: "This might affect [X]. Want me to re-evaluate it, or keep your current choice?"
- No congratulatory filler — no "Great choice!" or "Excellent!"
- After user picks, confirm in one sentence, update the table, move on
- During scaffolding, show progress concisely — don't narrate every file
- Keep all responses under 500 characters outside of tables and code blocks
</guardrails>

<success_criteria>
- [ ] Project name, description, package manager, and local dev mode captured
- [ ] Stack recommendation presented for all categories
- [ ] All required categories (frontend, database, deployment) confirmed or explicitly skipped
- [ ] `.stack-decisions.json` reflects the finalized state before scaffolding begins
- [ ] Scaffold CLI ran successfully (or manual fallback completed)
- [ ] All chosen integrations wired with connected boilerplate (not isolated examples)
- [ ] Docker Compose file generated (if chosen) with healthchecks and named volumes
- [ ] Deployment script and production env var list provided
- [ ] README generated with setup instructions and project structure
- [ ] Dependencies installed
- [ ] `.stack-decisions.json` deleted after completion
</success_criteria>
