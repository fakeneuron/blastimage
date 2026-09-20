import path from 'node:path';

import { expect, test } from '@playwright/test';

/**
 * Link imagegen + Load round (TEST-007.3).
 *
 * Hits the committed fixture at `test-fixtures/imagegen/` through the running
 * Next server. The picker's typed-path fallback is the CI-stable naming path
 * (the browse tree starts at $HOME). Keep / approve / discard / lightbox /
 * focus-trap belong to TEST-007.4.
 */
const FIXTURE_ROOT = path.join(process.cwd(), 'test-fixtures', 'imagegen');

test('links the fixture folder and loads round r1', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Project' })).toBeVisible();

  await page.getByRole('button', { name: 'Link imagegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Link imagegen folder' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Or type an absolute path').fill(FIXTURE_ROOT);
  await dialog.getByRole('button', { name: 'Link path' }).click();
  await expect(dialog).toBeHidden();

  await expect(
    page.getByRole('button', { name: 'imagegen linked: test-fixtures/imagegen' }),
  ).toBeVisible();

  // Auto-load (BI-026) ingests r1 without a Load click.
  await expect(page.getByRole('button', { name: 'Hero banner' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Task name' })).toHaveValue('Hero banner');
  await expect(page.getByLabel('Prompt')).toHaveValue('Warm hero shot for the homepage');
  await expect(page.getByRole('img', { name: 'Warm hero shot for the homepage' })).toHaveCount(2);

  // Explicit rN chip still re-loads and does not duplicate the task (BI-043).
  const loadRound = page.getByRole('button', { name: 'Load round r1' });
  await expect(loadRound).toBeEnabled();
  await loadRound.click();
  await expect(page.getByRole('button', { name: 'Hero banner' })).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Warm hero shot for the homepage' })).toHaveCount(2);
});
