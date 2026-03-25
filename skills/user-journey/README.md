# user-journey

Generate Playwright E2E test specs for user journeys — login flows, checkout funnels, onboarding wizards, CRUD panels, conditional form wizards, or any multi-step browser interaction.

## Usage

Just describe the flow you want tested. The skill triggers on prompts like:

- "Write E2E tests for the login flow"
- "Test the checkout process end to end"
- "Add Playwright tests for signup and onboarding"
- "I need browser tests for my admin panel"
- "Test our insurance quote form — it branches based on type"

## What it does

Guides the agent through a structured 5-phase workflow to produce production-quality Playwright test specs:

1. **Discover** — Understand the journey via conversation, codebase exploration, or live browser interaction
2. **Setup** — Detect or install Playwright, respect existing config, ask about suite structure
3. **Design** — Map out steps, locators, and assertions in a reviewable format before writing code
4. **Generate** — Write `.spec.ts` files following Playwright best practices
5. **Verify** — Run the tests and iterate on failures

## Features

- **Three discovery modes** — conversation-driven, codebase-driven, or browser-driven (using Playwright MCP to walk the running app)
- **MCP-aware** — detects Playwright MCP for live browser discovery, and documentation MCPs (Context7) for up-to-date API verification. Neither is required — the skill works without them.
- **Role-based locators first** — `getByRole`, `getByLabel`, `getByText` over CSS selectors or data-testid
- **`test.step()` for every phase** — readable trace output, failures pinpointed to the exact journey step
- **Web-first assertions** — auto-waiting `toBeVisible()`, `toHaveURL()`, no `waitForTimeout()` calls
- **Smart auth handling** — recommends `storageState` when 3+ tests need auth, inline login for simpler cases
- **Page Object Model when warranted** — suggests POM for 3+ page journeys, keeps it flat for simpler flows
- **Negative assertions for conditional flows** — verifies wrong branches don't render in wizard-style UIs
- **Existing setup respect** — detects Playwright config, test directories, and package manager preferences

## Test scenarios

| Scenario | Prompt | What it tests |
|----------|--------|--------------|
| Login flow | "Write a Playwright E2E test for the login flow" | Basic journey, locator quality, test.step usage |
| E-commerce checkout | "I need E2E tests for my checkout flow" (no Playwright) | Setup detection, multi-step journey, install offer |
| Signup onboarding | "Create Playwright tests for signup and onboarding" (existing e2e/) | Config respect, POM suggestion, multi-page funnel |
| Admin CRUD panel | "Write E2E tests for my admin panel" (auth, modals, CSV) | storageState, modal scoping, file downloads, access control |
| Conditional wizard | "Test our insurance quote form" (branching paths) | Non-linear flows, different input types, negative assertions |

## Eval results

**Skill win rate: 75% (18/24 criteria comparisons). Baseline wins: 0/24.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| login-with-auth | 7/8 | 1/8 | 0/8 |
| checkout-seeded-data | 6/8 | 2/8 | 0/8 |
| conditional-wizard | 5/8 | 3/8 | 0/8 |

Rubric criteria: test.step usage, journey design, clarifying questions, test data strategy, locator quality, web-first assertions, setup respect, reference structure.

### Where the skill dominates

- **test.step() usage** (3/3 wins) — with-skill always uses it. Baseline never does.
- **Journey design before code** (3/3 wins) — reviewable step map with actions, targets, assertions every time. Baseline jumps to code.
- **Test data strategy** (2/3 wins) — asks about test user creation, seed endpoints, session linkage, and cleanup. Baseline hardcodes credentials or assumes wrong association mechanism.
- **Clarifying questions** (3/3 wins) — structured discovery including auth, data, scope, and suite structure. Baseline asks reactively or assumes.
- **Locator quality** (3/3 wins) — reads actual source code before choosing locators. Baseline guesses CSS selectors on complex forms.

### Where the baseline holds up

- **Web-first assertions** (3/3 ties) — baseline knows Playwright assertion patterns well. Both use toBeVisible(), toHaveURL(), no waitForTimeout().

### Evolution

- Prior eval (pass/fail): 100% vs 61.1%
- Iteration 1 (rubric): 54% — baseline caught up on fundamentals, skill's process value not stressed enough by evals
- Iteration 2 (rubric): 75% — added test data strategy instruction, redesigned evals to stress auth and seeding, extracted code templates to reference
