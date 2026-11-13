import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Download } from '@playwright/test';

import { copyFixture, linkImagegenRoot, removeFixture } from './helpers';

/**
 * Exporting an approved clip (BI-078.5).
 *
 * Links a copy of `test-fixtures/imagegen-clip/`, approves the first take, and
 * runs the gallery's Folder export. The native directory picker cannot be
 * driven, so the spec removes `showDirectoryPicker` before the app loads and
 * the export takes its download fallback (`downloadManifestBundle`), the path
 * WebKit always takes. It copies the fixture because Approve writes
 * `approved/` and `rounds/r1/selection.json` (CLAUDE.md §Stack "Testing").
 */
test.describe('clip export', () => {
  let root = '';

  test.afterEach(() => removeFixture(root));

  test('an approved clip exports as <slug>-<id8>.mp4 with its manifest fields', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    });
    root = copyFixture('imagegen-clip');
    await linkImagegenRoot(page, root, 'imagegen-clip');

    const selectionWritten = page.waitForResponse(
      (res) => res.url().includes('/api/imagegen/selection') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Approve' }).first().click();
    await selectionWritten;

    const downloads: Download[] = [];
    page.on('download', (d) => downloads.push(d));
    await page.getByRole('button', { name: 'Folder' }).click();
    await expect.poll(() => downloads.length).toBe(2);

    const byName = new Map(downloads.map((d) => [d.suggestedFilename(), d] as const));
    const manifestPath = await byName.get('manifest.json')?.path();
    expect(manifestPath).toBeTruthy();
    const manifest = JSON.parse(fs.readFileSync(manifestPath!, 'utf8')) as {
      approved: Array<Record<string, unknown>>;
    };
    expect(manifest.approved).toHaveLength(1);
    const entry = manifest.approved[0]!;
    expect(entry).toMatchObject({
      taskName: 'Hero banner',
      finalPrompt: 'Slow push-in on the hero still, ambient one-move loop',
      url: 'imagegen:rounds/r1/hero-banner-001.mp4',
      mediaKind: 'video',
      posterUrl: 'imagegen:approved/hero-banner-002.jpg',
      durationSeconds: 2,
    });

    const clipName = `hero-banner-${String(entry.imageId).slice(0, 8)}.mp4`;
    const clipPath = await byName.get(clipName)?.path();
    expect(clipPath, `${clipName} downloaded`).toBeTruthy();
    const take = fs.readFileSync(path.join(root, 'rounds', 'r1', 'hero-banner-001.mp4'));
    expect(fs.readFileSync(clipPath!).equals(take)).toBe(true);
  });
});
