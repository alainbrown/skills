# Playwright Test Patterns

Code templates and patterns for generating Playwright E2E tests. Read this during Phase 4 (Generate).

## Spec file structure

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

## Page Object Model

Use when the journey spans 3+ pages that will be reused across tests. Keep page objects focused — one class per page or major component. Don't create one for something used in only one test.

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

## Auth setup (shared storageState)

Recommend this when 3+ tests need authentication. For 1-2 tests, inline login is fine.

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

## webServer config

When the app isn't running, add this to `playwright.config.ts`:

```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
},
```
