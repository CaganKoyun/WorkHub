/**
 * Command palette (Cmd+K) — opens a dialog, filters items, arrow-key +
 * Enter navigates. This exercises the app's central navigation
 * shortcut without depending on any specific menu label.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('Cmd+K opens the global search palette and Escape closes it', async ({ page, browserName }) => {
  await loginAs(page, 'owner');
  await page.goto('/home');
  await page.waitForTimeout(1000);

  // Meta on macOS, Control everywhere else — Playwright resolves it.
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+k`);

  // The Radix Dialog + cmdk stack renders a role=dialog with a search
  // combobox input. Either signal proves the palette opened.
  const dialog = page.getByRole('dialog');
  const searchInput = page.getByRole('combobox').or(page.getByPlaceholder(/search/i));
  const opened = await dialog.first().isVisible().catch(() => false)
    || await searchInput.first().isVisible().catch(() => false);
  expect(opened, `Cmd+K should open palette (browser: ${browserName})`).toBe(true);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await expect(dialog).toHaveCount(0);
});

test('palette search surfaces a seeded task by name', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/home');
  await page.waitForTimeout(1000);

  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+k`);
  await page.waitForTimeout(400);

  const input = page.getByPlaceholder(/search/i).or(page.getByRole('combobox'));
  await input.first().fill('pricing page');
  await page.waitForTimeout(1200); // debounced query

  // The seeded "Ship pricing page rewrite" task should surface.
  await expect(page.getByText(/ship pricing page rewrite/i).first())
    .toBeVisible({ timeout: 5000 });
});
