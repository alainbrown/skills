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

**Skill win rate: 62% (13/21 criteria comparisons, excl. structural). Baseline wins: 0/21.**

| Eval | Skill Wins | Ties | Baseline Wins |
|------|-----------|------|---------------|
| login-flow | 4/8 | 4/8 | 0/8 |
| checkout-no-playwright | 5/8 | 3/8 | 0/8 |
| conditional-wizard | 4/8 | 4/8 | 0/8 |

Rubric criteria: test.step usage, journey design, clarifying questions, auth handling, locator quality, web-first assertions, setup respect, reference structure.

### Where the skill dominates

- **test.step() usage** (3/3 wins) — with-skill always uses it for every journey phase. Baseline never does — 0/3 evals.
- **Journey design before code** (3/3 wins) — with-skill presents a reviewable step map with actions, targets, assertions. Baseline jumps straight to code every time.
- **Clarifying questions** (2-3/3 wins) — with-skill asks about credentials, UI patterns, suite structure before generating. Baseline assumes or asks reactively.
- **Locator quality** (2/3 wins) — with-skill reads source code to discover actual element structure. Baseline guesses CSS selectors on complex forms.

### Where the baseline narrowed the gap

- **Web-first assertions** (3/3 ties) — baseline LLMs know Playwright assertion patterns well now. Both use toBeVisible(), toHaveURL(), no waitForTimeout().
- **Auth handling** (3/3 ties) — test scenarios didn't stress auth (only guest checkout). Both handle simple cases correctly.
- **Setup detection** (1/3 ties) — baseline now detects and installs Playwright competently.

### Evolution from prior eval

Prior eval used pass/fail metrics (100% vs 61.1%). Current eval uses rubric-based grading (62% win rate). The skill's core value is in process (design before code, test.step(), structured discovery) rather than output patterns (assertions, locators) that the baseline now handles well.
