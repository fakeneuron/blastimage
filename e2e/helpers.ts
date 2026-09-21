import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expect, type Page } from '@playwright/test';

/**
 * Shared link flow for specs that need a linked imagegen root (TEST-008).
 *
 * Extracted from `review-keyboard.spec.ts` when a third spec needed the same
 * goto → Link imagegen → typed path → assert-loaded sequence; TEST-007.N
 * finding 3 named that third spec as the extraction trigger.
 *
 * `imagegen-link-load.spec.ts` deliberately keeps its own inline flow — the
 * link flow is *that* spec's subject and it asserts intermediate states this
 * helper hides (the linked-folder button label, the auto-loaded field values,
 * Load-round idempotence). Do not fold it in.
 *
 * The flow copies the fixture rather than linking it in place because both
 * callers write under the linked root — Approve emits `approved/`, Iterate
 * emits `rounds/r1/selection.json`. That is the contract in `CLAUDE.md`
 * §Stack "Testing".
 */
const SOURCE_FIXTURE = path.join(process.cwd(), 'test-fixtures', 'imagegen');

/** Copies `test-fixtures/imagegen/` into a fresh temp dir and returns its path. */
export function copyFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blastimage-e2e-'));
  fs.cpSync(SOURCE_FIXTURE, root, { recursive: true });
  return root;
}

/** Removes a {@link copyFixture} root. No-op for an empty path. */
export function removeFixture(root: string): void {
  if (root) fs.rmSync(root, { recursive: true, force: true });
}

/**
 * Loads the workspace and links `root` through the picker's typed-path
 * fallback (the CI-stable naming path — the browse tree starts at `$HOME`),
 * returning once round r1 has auto-loaded (BI-026).
 */
/** Opens the sidebar ⋯ disclosure that holds Link imagegen / switch / backup. */
export async function openProjectMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Project menu' }).click();
}

export async function linkImagegenRoot(page: Page, root: string): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Project menu' })).toBeVisible();

  await openProjectMenu(page);
  await page.getByRole('button', { name: 'Link imagegen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Link imagegen folder' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Or type an absolute path').fill(root);
  await dialog.getByRole('button', { name: 'Link path' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('button', { name: 'Hero banner' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Warm hero shot for the homepage' })).toHaveCount(2);
}
