import { expect, test, type Locator, type Page } from '@playwright/test';

import { openProjectMenu } from './helpers';

/**
 * Link picker layout stability (BI-069).
 *
 * The dialog was vertically centered (it is top-anchored since BI-070), so when
 * the mount-time browse landed and grew the listing, Link path moved ~100px. Playwright's click aims at the box
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

/**
 * Link picker, late arrivals (BI-070).
 *
 * BI-069 pinned the list height. Two more things still show up after mount: the
 * Found-nearby suggestions (above Link path) and the in-dialog error banner
 * (below it). Either grew the vertically centered dialog and moved Link path.
 */
async function openLinkDialog(page: Page): Promise<Locator> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Project menu' })).toBeVisible();
  await openProjectMenu(page);
  await page.getByRole('button', { name: 'Link imagegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Link imagegen folder' });
  await expect(dialog).toBeVisible();
  // Up is enabled only once a listing with a parent has been applied.
  await expect(dialog.getByRole('button', { name: '↑ Up' })).toBeEnabled();
  return dialog;
}

test('Link path stays put when a Found-nearby suggestion arrives late', async ({ page }) => {
  let releaseSuggest!: () => void;
  const held = new Promise<void>((resolve) => (releaseSuggest = resolve));
  // `**` tail: the client requests `/api/imagegen/link?` with an empty query.
  await page.route('**/api/imagegen/link**', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await held;
    await route.fulfill({ json: { ok: true, value: ['/tmp/late/imagegen'] } }).catch(() => {});
  });

  try {
    const dialog = await openLinkDialog(page);
    await dialog.getByLabel('Or type an absolute path').fill('/tmp/imagegen');
    const linkPath = dialog.getByRole('button', { name: 'Link path' });
    await expect(linkPath).toBeEnabled();
    const before = await linkPath.boundingBox();

    releaseSuggest();
    await expect(dialog.getByRole('button', { name: '📁 /tmp/late/imagegen' })).toBeVisible();
    expect(await linkPath.boundingBox()).toEqual(before);
  } finally {
    releaseSuggest();
  }
});

test('Link path stays put when the error banner appears', async ({ page }) => {
  // Both stubbed so no host state (nearby folders, the filesystem) can add a second late arrival.
  await page.route('**/api/imagegen/link**', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { ok: true, value: [] } });
    }
    return route.fulfill({ json: { ok: false, error: 'No such folder.' } });
  });

  const dialog = await openLinkDialog(page);
  await dialog.getByLabel('Or type an absolute path').fill('/tmp/imagegen');
  const linkPath = dialog.getByRole('button', { name: 'Link path' });
  await expect(linkPath).toBeEnabled();
  const before = await linkPath.boundingBox();

  await linkPath.click();
  const alert = dialog.getByRole('alert');
  await expect(alert).toBeVisible();
  expect(await linkPath.boundingBox()).toEqual(before);
  // Not clipped below the dialog's scroll fold: the message is the point of the banner.
  await expect(alert).toBeInViewport({ ratio: 1 });
  const [box, dialogBox] = [await alert.boundingBox(), await dialog.boundingBox()];
  expect(box!.y + box!.height).toBeLessThanOrEqual(dialogBox!.y + dialogBox!.height);
});
