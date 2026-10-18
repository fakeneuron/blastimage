import { expect, test } from '@playwright/test';

import { openProjectMenu } from './helpers';

/**
 * Link picker layout stability (BI-069).
 *
 * The dialog is vertically centered, so when the mount-time browse landed and
 * grew the listing, Link path moved ~100px. Playwright's click aims at the box
 * it saw stable, and a listing arriving in that window sent the click to the
 * dialog container instead — the intermittent webkit failure in
 * `linkImagegenRoot`. Holding the browse response until the box is measured
 * makes the window deterministic.
 */
test('Link path stays put when the folder listing arrives', async ({ page }) => {
  let releaseBrowse!: () => void;
  const held = new Promise<void>((resolve) => (releaseBrowse = resolve));
  await page.route('**/api/imagegen/browse**', async (route) => {
    await held;
    await route.continue().catch(() => {});
  });

  try {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Project menu' })).toBeVisible();
    await openProjectMenu(page);
    await page.getByRole('button', { name: 'Link imagegen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Link imagegen folder' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Loading…')).toBeVisible();

    // Typed first so the button is enabled, as in `linkImagegenRoot`.
    await dialog.getByLabel('Or type an absolute path').fill('/tmp/imagegen');
    const linkPath = dialog.getByRole('button', { name: 'Link path' });
    await expect(linkPath).toBeEnabled();
    const before = await linkPath.boundingBox();

    releaseBrowse();
    // Up is enabled only once a listing with a parent has been applied.
    await expect(dialog.getByRole('button', { name: '↑ Up' })).toBeEnabled();
    expect(await linkPath.boundingBox()).toEqual(before);
  } finally {
    releaseBrowse();
  }
});
