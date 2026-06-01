import { expect, test } from './fixtures';

// Sample E2E spec: open the popup page and assert it renders + toggles.
test('popup renders and toggles enabled', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  // Container finishes loading settings, then renders the wordmark.
  await expect(page.locator('.wordmark h1')).toBeVisible();

  // The toggle is on by default (SETTINGS_DEFAULTS.enabled = true).
  const toggle = page.getByRole('switch');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  // Flip it off; state must persist across a reload (chrome.storage.sync).
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await page.reload();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
});
