import { expect, test, type Locator, type Page } from '@playwright/test';

import { copyFixture, linkImagegenRoot, removeFixture } from './helpers';

/**
 * Supported-width floor (BI-076).
 *
 * blastimage is desktop-only, with a 1024 px floor. Phones are out of scope:
 * the dev server binds to loopback (BI-058), so a phone cannot reach it.
 * The floor is set by the widest layout, not the empty one. The 288 px
 * Sidebar plus the 256 px gallery rail (open once something is approved,
 * BI-054) leave the main pane about 480 px here. At 390 px the empty view
 * overflowed (scrollWidth 401), and that stays unsupported. DOM-only,
 * modelled on marscharts' `header-narrow.spec.ts`: overflow and
 * bounding-box edges, not pixels.
 */
const FLOOR = 1024;

/**
 * The root, and every container that scrolls or clips. TaskDetail's
 * `overflow-y-auto` makes its overflow-x `auto` too, so a too-wide card grid
 * would scroll inside the pane and never reach the root's scrollWidth. The
 * `overflow-hidden` review cards would hide a too-wide control row instead.
 * Deliberate `truncate` (text-overflow: ellipsis) is not overflow, nor is
 * `sr-only` text clipped to a 1 px box.
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflowing = await page.evaluate(() =>
    [document.documentElement, ...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        const { overflowX, textOverflow } = getComputedStyle(el);
        const contains = el === document.documentElement || overflowX !== 'visible';
        const deliberate = textOverflow === 'ellipsis' || el.clientWidth <= 1;
        return contains && !deliberate && el.scrollWidth > el.clientWidth;
      })
      .map((el) => `${el.tagName}.${el.getAttribute('class') ?? ''} ${el.scrollWidth} > ${el.clientWidth}`),
  );
  expect(overflowing).toEqual([]);
}

async function expectOnScreen(page: Page, control: Locator, label: string): Promise<void> {
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const box = await control.boundingBox();
  expect(box, `${label} has no box`).not.toBeNull();
  expect(box!.x, `${label} left edge`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${label} right edge`).toBeLessThanOrEqual(viewportWidth);
}

/** No overflow anywhere, and every visible button inside the viewport. */
async function expectFits(page: Page): Promise<void> {
  await expectNoHorizontalOverflow(page);
  for (const button of await page.getByRole('button').all()) {
    if (!(await button.isVisible())) continue;
    const name = (await button.getAttribute('aria-label')) ?? (await button.innerText());
    await expectOnScreen(page, button, `button "${name.trim()}"`);
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: FLOOR, height: 800 });
});

test(`home view fits at ${FLOOR} px`, async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Project menu' })).toBeVisible();
  await expectFits(page);
});

test.describe('with a linked round', () => {
  let root = '';

  test.beforeEach(async ({ page }) => {
    root = copyFixture();
    await linkImagegenRoot(page, root);
  });

  test.afterEach(() => removeFixture(root));

  // Two states, because they never coexist: the widest card row (decisions,
  // Feedback, Iterate →) exists only before an approve, and the rail opens
  // only after one, which removes Iterate.
  test(`review cards fit at ${FLOOR} px, then cards and rail`, async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Iterate →' }).first()).toBeVisible();
    await expectFits(page);

    // Awaited so `afterEach`'s removeFixture cannot race the write (BI-071).
    const selectionWritten = page.waitForResponse(
      (res) => res.url().includes('/api/imagegen/selection') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Approve' }).first().click();
    const folder = page.getByRole('button', { name: 'Folder' });
    await expect(folder).toBeVisible();
    await selectionWritten;

    await expectFits(page);
  });
});
