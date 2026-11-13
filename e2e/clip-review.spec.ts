import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Locator } from '@playwright/test';

import { copyFixture, linkImagegenRoot, removeFixture } from './helpers';

/**
 * Reviewing a clip round (BI-078.4).
 *
 * Links a copy of `test-fixtures/imagegen-clip/` (two 2 s H.264 takes animated
 * from `approved/hero-banner-002.jpg`) and drives the review surfaces in a real
 * browser: the cards are posters with a duration badge, hover plays, reduced
 * motion does not, the lightbox has controls, and Iterate writes the same
 * `iterate` entry as a still, naming `/blast-animate`. It copies the fixture
 * because Iterate writes `rounds/r1/selection.json` (CLAUDE.md §Stack "Testing").
 *
 * Playback is read from `paused` / `currentTime`, not pixels: both Chromium and
 * WebKit load this fixture's metadata (BI-078.3).
 */
const MOTION_PROMPT = 'Slow push-in on the hero still, ambient one-move loop';

function readSelection(root: string): { tasks?: unknown[] } | null {
  const file = path.join(root, 'rounds', 'r1', 'selection.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as { tasks?: unknown[] };
}

const isPaused = (video: Locator) => video.evaluate((v: HTMLVideoElement) => v.paused);

test.describe('clip round review', () => {
  let root = '';

  test.afterEach(() => removeFixture(root));

  test('cards show the source still as poster and a duration badge', async ({ page }) => {
    root = copyFixture('imagegen-clip');
    await linkImagegenRoot(page, root, 'imagegen-clip');

    const takes = page.locator('li video');
    await expect(takes).toHaveCount(2);
    for (const take of await takes.all()) {
      const poster = new URL((await take.getAttribute('poster')) ?? '', 'http://x');
      expect(poster.searchParams.get('path')).toBe('approved/hero-banner-002.jpg');
      expect(await take.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
    }
    await expect(page.getByLabel('Clip, 2 seconds')).toHaveCount(2);
    await expect(page.getByLabel('Clip, 2 seconds').first()).toHaveText('▶ 0:02');
  });

  test('hover plays a take and leaving pauses it', async ({ page }) => {
    root = copyFixture('imagegen-clip');
    await linkImagegenRoot(page, root, 'imagegen-clip');

    const first = page.locator('li video').first();
    expect(await isPaused(first)).toBe(true);

    await first.hover();
    await expect.poll(() => isPaused(first)).toBe(false);

    await page.mouse.move(0, 0);
    await expect.poll(() => isPaused(first)).toBe(true);
  });

  test('reduced motion keeps the poster on hover', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    root = copyFixture('imagegen-clip');
    await linkImagegenRoot(page, root, 'imagegen-clip');

    const first = page.locator('li video').first();
    await first.hover();
    // Give a play() that should not happen time to land.
    await page.waitForTimeout(300);
    expect(await isPaused(first)).toBe(true);
  });

  test('the lightbox gives a clip native controls', async ({ page }) => {
    root = copyFixture('imagegen-clip');
    await linkImagegenRoot(page, root, 'imagegen-clip');

    await page.getByRole('button', { name: 'View full size' }).first().click();
    const viewer = page.getByRole('dialog', { name: 'Image viewer' });
    await expect(viewer.locator('video')).toHaveAttribute('controls', '');
  });

  test('iterate on a clip writes the motion prompt and names /blast-animate', async ({ page }) => {
    root = copyFixture('imagegen-clip');
    await linkImagegenRoot(page, root, 'imagegen-clip');

    await page.getByRole('button', { name: 'Keep' }).first().click();
    await page.getByRole('button', { name: 'Iterate →', disabled: false }).click();
    const iterate = page.getByRole('dialog', { name: 'Iterate from keeper' });
    await expect(iterate.getByRole('heading', { name: 'Re-animate from this take' })).toBeVisible();

    const edited = `${MOTION_PROMPT}, slower`;
    await iterate.getByRole('textbox', { name: 'Refined motion prompt' }).fill(edited);
    await iterate.getByRole('button', { name: 'Save selection request' }).click();
    await expect(iterate).toBeHidden();

    await expect(page.getByRole('status')).toContainText('/blast-animate');
    await expect
      .poll(() => readSelection(root)?.tasks ?? null, { message: 'selection.json written' })
      .toEqual([
        {
          slug: 'hero-banner',
          decision: 'iterate',
          keeper: 'hero-banner-001.mp4',
          promptMode: 'overhaul',
          nextPrompt: edited,
        },
      ]);
  });
});
