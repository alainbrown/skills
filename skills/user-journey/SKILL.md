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

### Option C: Browser-driven

If the app is running locally (dev server), use agent-browser to walk through it:

1. Navigate to the starting URL
2. Take snapshots at each step to understand the UI
3. Interact with forms, buttons, and navigation
4. Record the sequence of actions and resulting page states

This is the most accurate approach for complex UIs where the codebase alone doesn't tell the full story. Convert what you observe into a journey spec.

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

Write clean, readable Playwright specs following these patterns.

### File structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Journey Name', () => {
  test('should complete the full journey', async ({ page }) => {
    // Step 1: Starting point
    await test.step('Navigate to starting page', async () => {
      await page.goto('/start');
      await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    });

    // Step 2: First interaction
    await test.step('Fill in the form', async () => {
      await page.getByLabel('Email').fill('user@example.com');
      await page.getByLabel('Password').fill('securepass');
      await page.getByRole('button', { name: 'Continue' }).click();
    });

    // Step 3: Verify outcome
    await test.step('Verify success', async () => {
      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByText('Welcome back')).toBeVisible();
    });
  });
});
```

### Code principles

- **`test.step()` for every journey phase.** This gives readable trace output and makes failures easy to locate. Each step should map to a logical user action, not a single line of code.

- **Web-first assertions everywhere.** Use `expect(locator).toBeVisible()`, `expect(page).toHaveURL()`, `expect(locator).toHaveText()`. These auto-wait and produce clear error messages. Never use `page.waitForSelector()` followed by a manual check.

- **No magic waits.** Don't use `page.waitForTimeout()`. If you need to wait for something, wait for a specific condition — a network response (`page.waitForResponse()`), a URL change (`page.waitForURL()`), or an element state.

- **Descriptive test names.** The test name should describe the journey outcome: `'should complete checkout with credit card'`, not `'test checkout'`.

- **Comments only for non-obvious setup.** Don't comment every line. Do comment why a particular wait or workaround exists.

### When to use Page Object Model

If the user opted for a full suite structure, or if the journey involves 3+ pages that will be reused across tests, extract page objects:

```typescript
// pages/login.page.ts
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

Page objects encapsulate locators and common actions for a page. Keep them focused — one class per page or major component. Don't create a page object for something used in only one test.

### Auth setup (when needed)

```typescript
// auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

And in `playwright.config.ts`:
```typescript
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/user.json',
    },
    dependencies: ['setup'],
  },
],
```

---

## Phase 5: Verify

After generating the test, run it.

### Run the tests

```bash
npx playwright test <spec-file> --reporter=list
```

Use `--reporter=list` for readable console output during development.

If the app isn't running, check if there's a `webServer` config in `playwright.config.ts`. If not, tell the user they need to start their dev server first, or offer to add a `webServer` block:

```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
},
```

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
