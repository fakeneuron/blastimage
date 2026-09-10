import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

/**
 * Review keep/discard/approve + lightbox keyboard + focus trap (TEST-007.4).
 *
 * Links a *copy* of `test-fixtures/imagegen/` so Approve's `selection.json` /
 * `approved/` writes cannot dirty the committed fixture. Typed-path fallback
 * is the CI-stable naming path (same as TEST-007.3).
 */
const SOURCE_FIXTURE = path.join(process.cwd(), 'test-fixtures', 'imagegen');

async function linkCopiedFixture(page: Page, root: string): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Project' })).toBeVisible();

  await page.getByRole('button', { name: 'Link imagegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Link imagegen folder' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Or type an absolute path').fill(root);
  await dialog.getByRole('button', { name: 'Link path' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('button', { name: 'Hero banner' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Warm hero shot for the homepage' })).toHaveCount(2);
}

test.describe('review keyboard', () => {
  let root = '';

  test.beforeEach(async ({ page }) => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'blastimage-e2e-'));
    fs.cpSync(SOURCE_FIXTURE, root, { recursive: true });
    await linkCopiedFixture(page, root);
  });

  test.afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

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

    await expect(page.getByRole('combobox', { name: 'Project' })).not.toBeFocused();
    await expect(page.getByRole('button', { name: 'Keep' }).first()).not.toBeFocused();

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await expect(opener).toBeFocused();
  });
});
