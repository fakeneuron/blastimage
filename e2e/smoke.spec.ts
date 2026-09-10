import { expect, test } from '@playwright/test';

/**
 * Harness proof (TEST-007.2). Folder-picker / round-load / review-keyboard
 * paths belong to TEST-007.3 and TEST-007.4 — this spec only asserts the
 * workspace shell booted on the dedicated e2e port.
 */
test('workspace shell loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('blastimage');
  await expect(page.getByRole('combobox', { name: 'Project' })).toBeVisible();
});
