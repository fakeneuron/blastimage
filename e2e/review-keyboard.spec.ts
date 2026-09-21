import { expect, test } from '@playwright/test';

import { copyFixture, linkImagegenRoot, removeFixture } from './helpers';

/**
 * Review keep/discard/approve + lightbox keyboard + focus trap (TEST-007.4).
 *
 * Links a *copy* of `test-fixtures/imagegen/` so Approve's `selection.json` /
 * `approved/` writes cannot dirty the committed fixture. The copy-and-link
 * flow moved to `e2e/helpers.ts` in TEST-008.
 */
test.describe('review keyboard', () => {
  let root = '';

  test.beforeEach(async ({ page }) => {
    root = copyFixture();
    await linkImagegenRoot(page, root);
  });

  test.afterEach(() => removeFixture(root));

  test('keep, discard, and approve decisions on loaded cards', async ({ page }) => {
    const keep = page.getByRole('button', { name: 'Keep' });
    const discard = page.getByRole('button', { name: 'Discard' });
    const approve = page.getByRole('button', { name: 'Approve' });

    await keep.nth(0).click();
    await expect(keep.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Kept')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iterate →' })).toBeVisible();

    await discard.nth(1).click();
    await expect(discard.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Discarded')).toBeVisible();

    await approve.nth(0).click();
    await expect(approve.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(keep.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('Approved')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iterate →' })).toHaveCount(0);
    await expect(page.getByText('Approved images appear here.')).toHaveCount(0);
  });

  test('lightbox arrows and Escape in a real browser', async ({ page }) => {
    await page.getByRole('button', { name: 'View full size' }).first().click();
    const viewer = page.getByRole('dialog', { name: 'Image viewer' });
    await expect(viewer).toBeVisible();
    await expect(page.getByText('1 / 2')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('2 / 2')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('2 / 2')).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('1 / 2')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
  });

  test('lightbox focus trap holds Tab and restores the opener', async ({ page }) => {
    const opener = page.getByRole('button', { name: 'View full size' }).first();
    await opener.click();

    const viewer = page.getByRole('dialog', { name: 'Image viewer' });
    await expect(viewer).toBeVisible();
    await expect(viewer).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Next image' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Next image' })).toBeFocused();

    await expect(page.getByRole('button', { name: 'Project menu' })).not.toBeFocused();
    await expect(page.getByRole('button', { name: 'Keep' }).first()).not.toBeFocused();

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(opener).toBeFocused();
  });
});
