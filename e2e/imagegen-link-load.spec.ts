import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { copyFixture, openProjectMenu, removeFixture } from './helpers';

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
  await expect(page.getByRole('button', { name: 'Project menu' })).toBeVisible();

  await openProjectMenu(page);
  await page.getByRole('button', { name: 'Link imagegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Link imagegen folder' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Or type an absolute path').fill(FIXTURE_ROOT);
  await dialog.getByRole('button', { name: 'Link path' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByTitle(FIXTURE_ROOT)).toBeVisible();
  await expect(page.getByText('test-fixtures/imagegen')).toBeVisible();

  // Auto-load (BI-026 / BI-053.3) ingests r1 without a Load click.
  await expect(page.getByRole('button', { name: 'Hero banner' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Task name' })).toHaveValue('Hero banner');
  await expect(page.getByLabel('Prompt')).toHaveValue('Warm hero shot for the homepage');
  await expect(page.getByRole('img', { name: 'Warm hero shot for the homepage' })).toHaveCount(2);

  const r1 = page.getByRole('button', { name: 'Load round r1' });
  await expect(r1).toBeEnabled();
  await expect(r1).toHaveAttribute('aria-current', 'true');

  // Chip click is a view filter (BI-053.4), not a BI-043 replace — no duplicate task.
  await r1.click();
  await expect(page.getByRole('button', { name: 'Hero banner' })).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'Warm hero shot for the homepage' })).toHaveCount(2);
});

test('toggling rounds swaps the review grid without duplicating the task', async ({ page }) => {
  const root = copyFixture();
  const r1Dir = path.join(root, 'rounds', 'r1');
  const r2Dir = path.join(root, 'rounds', 'r2');
  fs.cpSync(r1Dir, r2Dir, { recursive: true });
  fs.writeFileSync(
    path.join(r2Dir, 'batch.json'),
    JSON.stringify({
      schemaVersion: 1,
      round: 2,
      generatedAt: '2026-06-19T00:00:00Z',
      tasks: [
        {
          slug: 'hero-banner',
          name: 'Hero banner',
          prompt: 'Cool hero shot for the homepage',
          images: ['hero-banner-001.jpg', 'hero-banner-002.jpg'],
        },
      ],
    }),
  );

  try {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Project menu' })).toBeVisible();
    await openProjectMenu(page);
    await page.getByRole('button', { name: 'Link imagegen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Link imagegen folder' });
    await dialog.getByLabel('Or type an absolute path').fill(root);
    await dialog.getByRole('button', { name: 'Link path' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole('button', { name: 'Load round r2' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByRole('img', { name: 'Cool hero shot for the homepage' })).toHaveCount(2);

    await page.getByRole('button', { name: 'Load round r1' }).click();
    await expect(page.getByRole('button', { name: 'Load round r1' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByRole('img', { name: 'Warm hero shot for the homepage' })).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Hero banner' })).toHaveCount(1);
  } finally {
    removeFixture(root);
  }
});
