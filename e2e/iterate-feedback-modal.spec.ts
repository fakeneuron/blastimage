import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { copyFixture, linkImagegenRoot, removeFixture } from './helpers';

/**
 * Iterate + Feedback modal paths and their focus traps (TEST-008).
 *
 * The gap TEST-007.4 deferred. Both modals are densely unit-tested with spied
 * callbacks under happy-dom; this spec covers the two things those tests
 * structurally cannot reach — real focus/Tab behaviour, and the round trip
 * through `useWorkspace` → `/api/imagegen/*` → disk and back into the card.
 *
 * Both paths write under the linked root (Feedback's Approve emits
 * `approved/`, Iterate emits `rounds/r1/selection.json`), so every test links
 * a temp copy of the fixture. Keep / discard / approve, the lightbox, and its
 * `focusTarget: 'dialog'` trap belong to `review-keyboard.spec.ts`; this spec
 * covers the form modals' `focusTarget: 'first'` half of BI-039.
 */
const BASE_PROMPT = 'Warm hero shot for the homepage';
const KEEPER = 'hero-banner-001.jpg';

/** The `selection.json` `requestNextRound` writes for round r1, or null. */
function readSelection(root: string): { tasks?: unknown[] } | null {
  const file = path.join(root, 'rounds', 'r1', 'selection.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as { tasks?: unknown[] };
}

test.describe('iterate and feedback modals', () => {
  let root = '';

  test.beforeEach(async ({ page }) => {
    root = copyFixture();
    await linkImagegenRoot(page, root);
  });

  test.afterEach(() => removeFixture(root));

  test('feedback notes persist to the card and Save & Keep flips the decision', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Feedback', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Image feedback' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('textbox', { name: 'Refinement notes' }).fill('warmer lighting');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();

    // The saved note flips the card's button label (BI-006).
    const edit = page.getByRole('button', { name: '💬 Edit feedback' });
    await expect(edit).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Keep' }).first()).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // Reopening prefills from the persisted feedback, and Save & Keep also
    // promotes the image to a keeper.
    await edit.click();
    await expect(dialog.getByRole('textbox', { name: 'Refinement notes' })).toHaveValue(
      'warmer lighting',
    );
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Save & Keep' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole('button', { name: 'Keep' }).first()).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Kept')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iterate →', disabled: false })).toBeVisible();
  });

  test('iterate composes the prefill from saved feedback and writes selection.json', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Feedback', exact: true }).first().click();
    const feedback = page.getByRole('dialog', { name: 'Image feedback' });
    await feedback.getByRole('textbox', { name: 'Refinement notes' }).fill('tighter crop');
    await feedback.getByRole('button', { name: 'Save & Keep' }).click();
    await expect(feedback).toBeHidden();

    await page.getByRole('button', { name: 'Iterate →', disabled: false }).click();
    const iterate = page.getByRole('dialog', { name: 'Iterate from keeper' });
    await expect(iterate).toBeVisible();

    // composePrompt: base prompt + the keeper's feedback as a Refine line (BI-009).
    const prompt = iterate.getByRole('textbox', { name: 'Refined prompt' });
    await expect(prompt).toHaveValue(`${BASE_PROMPT}\n\nRefine: tighter crop`);

    const edited = `${BASE_PROMPT}\n\nRefine: tighter crop, golden hour`;
    await prompt.fill(edited);
    await iterate.getByRole('button', { name: 'Save selection request' }).click();
    await expect(iterate).toBeHidden();

    // The request lands on disk for /blast-iterate to pick up.
    await expect
      .poll(() => readSelection(root)?.tasks ?? null, { message: 'selection.json written' })
      .toEqual([
        {
          slug: 'hero-banner',
          decision: 'iterate',
          keeper: KEEPER,
          promptMode: 'append',
          nextPrompt: edited,
        },
      ]);
  });

  test('iterate modal traps Tab, and dismissing it writes nothing', async ({ page }) => {
    await page.getByRole('button', { name: 'Keep' }).first().click();
    const opener = page.getByRole('button', { name: 'Iterate →', disabled: false });
    await opener.click();

    const iterate = page.getByRole('dialog', { name: 'Iterate from keeper' });
    await expect(iterate).toBeVisible();

    // focusTarget: 'first' — the prompt field, not the dialog container.
    const prompt = iterate.getByRole('textbox', { name: 'Refined prompt' });
    const cancel = iterate.getByRole('button', { name: 'Cancel' });
    const save = iterate.getByRole('button', { name: 'Save selection request' });
    await expect(prompt).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(save).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(prompt).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(save).toBeFocused();

    // Nothing behind the dialog can take focus.
    await expect(page.getByRole('button', { name: 'Project menu' })).not.toBeFocused();
    await expect(page.getByRole('button', { name: 'Keep' }).first()).not.toBeFocused();

    await page.keyboard.press('Escape');
    await expect(iterate).toBeHidden();
    await expect(opener).toBeFocused();
    expect(readSelection(root)).toBeNull();
  });

  test('feedback modal traps Tab and leaves the card untouched on Escape', async ({ page }) => {
    const opener = page.getByRole('button', { name: 'Feedback', exact: true }).first();
    await opener.click();

    const dialog = page.getByRole('dialog', { name: 'Image feedback' });
    await expect(dialog).toBeVisible();

    const notes = dialog.getByRole('textbox', { name: 'Refinement notes' });
    const reference = dialog.getByRole('checkbox');
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    const save = dialog.getByRole('button', { name: 'Save', exact: true });
    const saveKeep = dialog.getByRole('button', { name: 'Save & Keep' });
    const approve = dialog.getByRole('button', { name: 'Approve' });
    await expect(notes).toBeFocused();

    for (const control of [reference, cancel, save, saveKeep, approve, notes]) {
      await page.keyboard.press('Tab');
      await expect(control).toBeFocused();
    }

    await page.keyboard.press('Shift+Tab');
    await expect(approve).toBeFocused();

    await expect(page.getByRole('button', { name: 'Project menu' })).not.toBeFocused();

    // Typed notes are discarded on Escape — the parent owns dismissal.
    await notes.fill('never saved');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.getByRole('button', { name: '💬 Edit feedback' })).toHaveCount(0);
  });
});
