# user-journey

Generate Playwright E2E test specs for user journeys — login flows, checkout funnels, onboarding wizards, CRUD panels, conditional form wizards, or any multi-step browser interaction.

## Install

**Claude Code:**
```bash
/plugin marketplace add alainbrown/skills
/plugin install user-journey@alainbrown-skills
```

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

Tested across 5 scenarios, comparing with-skill vs baseline (no skill):

| Metric | With Skill | Baseline |
|--------|-----------|----------|
| **Pass rate** | **100%** (42/42) | **61.1%** |
| **Avg tokens** | 17,800 | 12,774 |

### Where the skill adds value

- **`test.step()` usage** — with-skill always uses it; baseline never does (0/5 evals)
- **Journey design before code** — with-skill presents a reviewable step map every time; baseline jumps to code
- **Clarifying questions** — with-skill asks about credentials, UI patterns, flow details; baseline assumes silently
- **storageState for auth** — with-skill recommends Playwright's built-in auth sharing; baseline re-authenticates per test
- **Page objects when appropriate** — with-skill suggests POM for complex multi-page journeys; baseline uses inline locators

### Where the baseline holds up

- Web-first assertions and no hardcoded waits — both do this well
- Unique test emails — both generate them
- Package manager awareness — both respect pnpm when told
- Conditional path separation — both generate per-path tests
