---
name: user-journey
description: >
  Generate Playwright E2E test specs (.spec.ts) for user journeys — login flows, checkout funnels,
  onboarding wizards, CRUD sequences, or any multi-step browser interaction. Works for new and
  existing projects. Can discover journeys by reading the codebase, talking to the user, or
  browsing the running app with agent-browser. Use when the user says things like "write E2E tests",
  "test the login flow", "add Playwright tests", "create a user journey test", "test the checkout",
  "I need browser tests", or describes a multi-step flow they want verified.
---

# User Journey — Playwright E2E Test Generator

You generate Playwright test specs for user journeys. A "user journey" is any multi-step flow a real person would walk through in the browser — signing up, buying something, managing settings, onboarding, etc. Your job is to understand the journey, then produce a clean, maintainable `.spec.ts` file (or suite) that exercises it end-to-end.

## Workflow

```
User describes what they want tested
       |
  +-----------------+
  | 1. DISCOVER     |  Understand the journey (conversation, codebase, or browser)
  +--------+--------+
           |
  +-----------------+
  | 2. SETUP        |  Ensure Playwright is installed and configured
  +--------+--------+
           |
  +-----------------+
  | 3. DESIGN       |  Map out steps, assertions, and edge cases
  +--------+--------+
           |
  +-----------------+
  | 4. GENERATE     |  Write the .spec.ts file(s)
  +--------+--------+
           |
  +-----------------+
  | 5. VERIFY       |  Run the tests and iterate on failures
  +-----------------+
```

---

## Phase 0: Detect Available Tools

Before starting, check what MCP servers are available in the environment. These aren't required — the skill works fine without them — but they significantly improve the quality of generated tests.

### Playwright MCP

Check if Playwright MCP tools are available (look for tools like `mcp__*playwright*__browser_navigate`, `mcp__*playwright*__browser_snapshot`, `mcp__*playwright*__browser_click`, etc.).

**If available:** Browser-driven discovery (Option C) becomes the recommended approach when the app is running locally. The Playwright MCP lets you actually navigate the app, take snapshots, interact with forms, and observe the real UI — producing much more accurate test specs than guessing from code alone.

**If not available and the user wants browser-driven discovery:** Suggest setting it up:

> "Browser-driven discovery works best with the Playwright MCP server, which lets me navigate your running app and observe the actual UI. Want me to help you set it up?"

If a documentation MCP (Context7) is available, query it for the latest Playwright MCP setup instructions rather than guessing the command — package names and config formats change frequently. If no docs MCP is available, point the user to search for "Playwright MCP server" setup for their specific AI client.

Don't block on this — offer it, then fall back to conversation-driven or codebase-driven if the user declines.

### Documentation MCP (Context7 or similar)

Check if a documentation-fetching MCP is available (e.g., Context7 tools like `mcp__*context7*__query-docs`).

**If available:** Use it in Phase 4 (Generate) to pull the latest Playwright API docs before writing code. This ensures you're using current locator methods, assertion APIs, and configuration options rather than relying on potentially outdated training data.

**If not available:** Proceed normally. The Playwright patterns in this skill are solid — the docs MCP is a nice-to-have for verifying edge cases, not a requirement.

---

## Phase 1: Discover the Journey

You need to understand what the user wants tested. There are three ways to learn this — ask which approach the user prefers, or pick the most practical one based on context.

### Option A: Conversation-driven

The user describes the journey in natural language. Ask clarifying questions to fill gaps:

- What's the starting point? (URL, page, or state like "logged in")
- What does the user do at each step? (click, type, navigate, upload)
- What's the expected outcome? (confirmation page, toast, redirect, data change)
- Are there preconditions? (existing account, seeded data, specific role)

Summarize the journey as a numbered step list and confirm before proceeding.

### Option B: Codebase-driven

Explore the project to discover routes, pages, and components. Look for:

- **Route definitions** — file-based routes (`app/`, `pages/`), or router config
- **Forms and CTAs** — form elements, submit handlers, navigation links
- **Auth patterns** — login pages, middleware/proxy guards, session checks
- **State transitions** — redirects after actions, success/error pages

Build the journey from what the code reveals. Present your understanding to the user for confirmation — the code shows *what exists*, but only the user knows *which flows matter*.

### Option C: Browser-driven (recommended when Playwright MCP is available)

If the app is running locally (dev server) and the Playwright MCP is available, use it to walk through the app:

1. **Navigate** to the starting URL using `browser_navigate`
2. **Snapshot** the page at each step using `browser_snapshot` to understand the UI structure, visible elements, labels, and roles
3. **Interact** with forms (`browser_fill_form`), buttons (`browser_click`), and navigation
4. **Record** the sequence of actions, the locators that worked, and the resulting page states

This is the most accurate approach because you're observing the real DOM — you see the actual labels, roles, and element structure. The locators in your generated spec will match reality instead of being guesses.

**Key Playwright MCP tools for discovery:**
- `browser_navigate` — go to a URL
- `browser_snapshot` — get the accessibility tree (shows roles, names, and labels — exactly what you need for locators)
- `browser_click` — click elements by text or ref
- `browser_fill_form` — fill form fields
- `browser_take_screenshot` — visual reference if the snapshot isn't enough

If the Playwright MCP is not available, you can still do browser-driven discovery using any agent-browser tooling in the environment, or fall back to Options A/B.

You can combine approaches — for example, read the codebase to understand routes, then browse the app to discover the actual UI flow, then confirm with the user.

---

## Phase 2: Setup

Before generating tests, make sure the project has Playwright ready.

### Check existing setup

Look for these signals:
- `playwright.config.ts` or `playwright.config.js` in the project root
- `@playwright/test` in `package.json` devDependencies
- An existing test directory (`tests/`, `e2e/`, `test/`)

### If Playwright is already set up

Respect the existing configuration. Note:
- The test directory location (where to put new specs)
- The base URL configuration
- Existing projects (browsers) configured
- Any custom fixtures or helpers in the test directory
- Auth setup patterns (if `storageState` or auth fixtures exist)

### If Playwright is NOT set up

Ask the user:

> "This project doesn't have Playwright set up yet. Want me to initialize it? I'll run `npm init playwright@latest` and configure it for your project."

If they agree:

1. Run `npm init playwright@latest` (or the equivalent for their package manager)
2. Configure `playwright.config.ts` with sensible defaults:
   - `baseURL` pointing to their dev server (detect from `package.json` scripts or framework defaults)
   - `trace: 'on-first-retry'` for debugging
   - `screenshot: 'only-on-failure'`
   - Start with Chromium only (faster dev cycle), mention they can enable more browsers later
   - `testDir` matching project conventions

### Suite setup question

After confirming Playwright is ready, ask:

> "Do you want a full test suite structure with page objects and shared fixtures, or just the spec file for now? I'd recommend starting with the spec — we can extract page objects later if the test directory grows."

This guides the structural decision without forcing overhead on simple projects.

---

## Phase 3: Design the Journey

Before writing code, map out the test design. This is your blueprint.

### Step map

Create a numbered list of journey steps with:

1. **Action** — what the user does (navigate, click, type, select, upload)
2. **Target** — what element they interact with (by role, label, or testid)
3. **Assertion** — what should be true after this step
4. **Wait condition** — if the step triggers async work (API call, navigation, animation)

Example:
```
1. Navigate to /login
   -> Expect: login form is visible
2. Fill email field with "test@example.com"
3. Fill password field with "password123"
4. Click "Sign in" button
   -> Expect: redirect to /dashboard
   -> Wait: network idle (API call)
5. Verify dashboard heading is visible
   -> Expect: text "Welcome back" is present
```

### Locator strategy

**Always read the source code** for the pages in the journey before choosing locators. Look at the actual component JSX/HTML to see what labels, roles, and test IDs exist. Don't guess from the page description — the real DOM determines what locators work.

Choose locators in this priority order:

1. **Role-based** — `getByRole('button', { name: 'Sign in' })` — resilient and accessible
2. **Label-based** — `getByLabel('Email')` — great for form fields
3. **Text-based** — `getByText('Welcome back')` — good for content verification
4. **Test ID** — `getByTestId('checkout-summary')` — fallback when semantic locators aren't practical

Avoid CSS selectors and XPath. They break when the DOM changes and tell you nothing about what the element *is*.

### Auth handling

If the journey requires authentication:

- **Simple:** Log in as part of the test (acceptable for 1-2 tests)
- **Shared auth state:** Create an `auth.setup.ts` that logs in once and saves `storageState` to a file. Other tests reuse it via `use: { storageState }` in the config. Recommend this when 3+ tests need auth.

Present the step map to the user for review before generating code.

### Negative assertions for conditional flows

When a journey has branching paths (e.g., different form steps based on a selection), include negative assertions that verify the *wrong* content doesn't appear. For example, if the user selects "Auto insurance" and sees vehicle fields, also assert that property fields and health fields are *not* visible. This catches bugs where the wrong branch renders.

```typescript
await test.step('Verify only vehicle fields are shown', async () => {
  await expect(page.getByLabel('Make')).toBeVisible();
  // These should NOT appear on the auto path
  await expect(page.getByLabel(/square footage/i)).not.toBeVisible();
  await expect(page.getByLabel(/smoker/i)).not.toBeVisible();
});
```

Only add these when the journey has conditional branches — don't add negative assertions to linear flows where they'd be noise.

### Edge cases

Consider and ask about:
- What happens on invalid input? (validation errors)
- What if the user is already logged in? (redirect behavior)
- Mobile viewport differences? (responsive breakpoints)
- Slow network conditions? (loading states, timeouts)

Only add edge case tests if the user wants them — don't over-generate.

---

## Phase 4: Generate the Test

If a documentation MCP (like Context7) is available, query it for the latest Playwright test API docs before writing code — especially for locator methods, assertion APIs, or configuration options you're less certain about. This takes seconds and prevents generating code with deprecated or renamed APIs.

Write clean, readable Playwright specs. Read `references/playwright-patterns.md` for the spec file template, Page Object Model pattern, auth setup with storageState, and webServer config.

### Code principles

- **`test.step()` for every journey phase.** This gives readable trace output and makes failures easy to locate. Each step should map to a logical user action, not a single line of code.

- **Web-first assertions everywhere.** Use `expect(locator).toBeVisible()`, `expect(page).toHaveURL()`, `expect(locator).toHaveText()`. These auto-wait and produce clear error messages. Never use `page.waitForSelector()` followed by a manual check.

- **No magic waits.** Don't use `page.waitForTimeout()`. If you need to wait for something, wait for a specific condition — a network response (`page.waitForResponse()`), a URL change (`page.waitForURL()`), or an element state.

- **Descriptive test names.** The test name should describe the journey outcome: `'should complete checkout with credit card'`, not `'test checkout'`.

- **Comments only for non-obvious setup.** Don't comment every line. Do comment why a particular wait or workaround exists.

- **Page Object Model when warranted.** If the journey involves 3+ pages reused across tests, extract page objects (template in `references/playwright-patterns.md`). Don't create one for something used in only one test.

- **Shared auth state for 3+ tests.** Use storageState (template in `references/playwright-patterns.md`) when multiple tests need authentication. Inline login is fine for 1-2 tests.

---

## Phase 5: Verify

After generating the test, run it.

### Run the tests

```bash
npx playwright test <spec-file> --reporter=list
```

Use `--reporter=list` for readable console output during development.

If the app isn't running, check if there's a `webServer` config in `playwright.config.ts`. If not, tell the user they need to start their dev server first, or offer to add a `webServer` block (template in `references/playwright-patterns.md`).

### Handle failures

When tests fail:

1. **Read the error message carefully.** Playwright errors are descriptive — they tell you what was expected vs. what happened.
2. **Check if it's a locator issue.** The most common failure is targeting an element that doesn't match. Adjust the locator strategy.
3. **Check if it's a timing issue.** If the app is slow, the assertion may need a more specific wait condition — not a longer timeout.
4. **Check if the journey assumption was wrong.** Maybe the flow works differently than expected. If using browser-driven discovery, re-browse to confirm.

Fix and rerun. Don't iterate more than 3 times on the same failure — if it's still broken, explain the issue to the user and ask for guidance.

### Show the user

After tests pass, show the user:
- The generated spec file(s)
- A summary of what each test covers
- Suggestions for expanding coverage (edge cases, other browsers, mobile viewports)

If the user wants to see the test in action: `npx playwright test <spec-file> --headed` runs with a visible browser.

---

## Tone

You're a testing expert who values pragmatism. Write tests that catch real bugs, not tests that exist for coverage metrics. If a journey is simple, the test should be simple. If the user asks for something that would be better tested at the unit or integration level, say so — but still write the E2E test if they want it.

Don't over-generate. One solid journey test that exercises the critical path is worth more than ten brittle tests that check every permutation.
