/**
 * imagegenServerFs tests (BI-045)
 *
 * Driven against a real temp directory rather than a mocked `fs`: the module's
 * whole job is what the filesystem actually does — realpath through symlinks,
 * `ENOENT` on a missing round, byte equality between two files — and a mock
 * would only re-assert the assumptions under test. The confinement suite in
 * particular is meaningless without real symlinks.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, realpath, rm, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  approvedConflict,
  listRounds,
  looksLikeImagegenRoot,
  promoteApproved,
  readBatchText,
  readImagegenBytes,
  readRoundSelection,
  removeApproved,
  resolveRoot,
  resolveUnderRoot,
  suggestRoots,
  writeRoundSelection,
} from './imagegenServerFs';
import { ROUND_SELECTION_SCHEMA_VERSION } from './roundSelection';

let workspace: string;
let root: string;

/** Writes a file under `root`, creating parents. */
async function put(relativePath: string, content: string): Promise<void> {
  const target = join(root, relativePath);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, content, 'utf8');
}

function batchJson(round: number): string {
  return JSON.stringify({ schemaVersion: 1, round, generatedAt: '2026-08-29T00:00:00.000Z', tasks: [] });
}

beforeEach(async () => {
  // Canonical from the start: `/var` is a symlink to `/private/var` on macOS,
  // and every entry point here is specified to take `resolveRoot`'s output.
  workspace = await realpath(await mkdtemp(join(tmpdir(), 'blastimage-')));
  root = join(workspace, 'repo', 'imagegen');
  await mkdir(root, { recursive: true });
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('resolveRoot', () => {
  it('canonicalizes an existing directory', async () => {
    expect(await resolveRoot(root)).toEqual({ ok: true, value: root });
  });

  it('rejects a relative path', async () => {
    const result = await resolveRoot('imagegen');
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/must be absolute/);
  });

  it('rejects a path that does not exist', async () => {
    const result = await resolveRoot(join(workspace, 'nope'));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/No such folder/);
  });

  it('rejects a file', async () => {
    await put('tasks.json', '{}');
    const result = await resolveRoot(join(root, 'tasks.json'));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/Not a folder/);
  });

  it('resolves a symlinked root to its target, so later confinement compares like with like', async () => {
    const link = join(workspace, 'shortcut');
    await symlink(root, link, 'dir');

    expect(await resolveRoot(link)).toEqual({ ok: true, value: root });
  });
});

describe('looksLikeImagegenRoot', () => {
  it('is false for an unrelated empty directory', async () => {
    expect(await looksLikeImagegenRoot(root)).toBe(false);
  });

  it('is true once any marker exists', async () => {
    await put('rounds/r1/batch.json', batchJson(1));
    expect(await looksLikeImagegenRoot(root)).toBe(true);
  });
});

describe('resolveUnderRoot confinement', () => {
  it('resolves a nested path under the root', async () => {
    const result = await resolveUnderRoot(root, 'rounds/r1/hero.png');
    expect(result).toEqual({ ok: true, value: join(root, 'rounds/r1/hero.png') });
  });

  it('rejects an empty path', async () => {
    expect(await resolveUnderRoot(root, '')).toMatchObject({ ok: false });
  });

  it('rejects a ../ escape', async () => {
    const result = await resolveUnderRoot(root, '../../secrets.txt');
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/escapes the linked imagegen folder/);
  });

  it('rejects a symlink pointing outside the root, whose lexical path looks innocent', async () => {
    await writeFile(join(workspace, 'secrets.txt'), 'private', 'utf8');
    await symlink(join(workspace, 'secrets.txt'), join(root, 'escape.txt'));

    const result = await resolveUnderRoot(root, 'escape.txt');
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/escapes the linked imagegen folder/);
  });

  it('rejects a write aimed through a symlinked directory at a file that does not exist yet', async () => {
    await mkdir(join(workspace, 'elsewhere'), { recursive: true });
    await symlink(join(workspace, 'elsewhere'), join(root, 'approved'), 'dir');

    expect(await resolveUnderRoot(root, 'approved/new.png')).toMatchObject({ ok: false });
  });

  it('reads and refuses through the public entry points too', async () => {
    await writeFile(join(workspace, 'secrets.txt'), 'private', 'utf8');

    expect(await readImagegenBytes(root, '../secrets.txt')).toMatchObject({ ok: false });
  });
});

describe('listRounds', () => {
  it('returns an empty list when there is no rounds/ directory', async () => {
    expect(await listRounds(root)).toEqual([]);
  });

  it('lists only round folders holding a batch.json, ascending', async () => {
    await put('rounds/r2/batch.json', batchJson(2));
    await put('rounds/r10/batch.json', batchJson(10));
    await put('rounds/r1/batch.json', batchJson(1));
    await mkdir(join(root, 'rounds', 'r3'), { recursive: true }); // no batch.json
    await put('rounds/notaround/batch.json', batchJson(4));

    expect(await listRounds(root)).toEqual([1, 2, 10]);
  });
});

describe('readBatchText', () => {
  it('returns the file as text for the client parser', async () => {
    await put('rounds/r1/batch.json', batchJson(1));

    expect(await readBatchText(root, 1)).toEqual({ ok: true, value: batchJson(1) });
  });

  it('fails with the path in the message when the round is absent', async () => {
    const result = await readBatchText(root, 7);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/rounds\/r7\/batch\.json/);
  });
});

describe('round selection', () => {
  it('reads an empty shell when selection.json does not exist', async () => {
    const result = await readRoundSelection(root, 3);
    expect(result).toMatchObject({
      ok: true,
      value: { schemaVersion: ROUND_SELECTION_SCHEMA_VERSION, round: 3, tasks: [] },
    });
  });

  it('rejects a selection.json whose round disagrees with its folder', async () => {
    await put(
      'rounds/r2/selection.json',
      JSON.stringify({ schemaVersion: 1, round: 5, selectedAt: 'x', tasks: [] }),
    );

    const result = await readRoundSelection(root, 2);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toMatch(/says round 5 but folder is r2/);
  });

  it('creates the round directory when the terminal loop has not made one', async () => {
    const written = await writeRoundSelection(
      root,
      1,
      [{ slug: 'hero', decision: 'approve', keeper: 'hero-01.png' }],
      '2026-08-29T12:00:00.000Z',
    );

    expect(written).toEqual({ ok: true, value: undefined });
    const onDisk = JSON.parse(await readFile(join(root, 'rounds/r1/selection.json'), 'utf8'));
    expect(onDisk).toMatchObject({ round: 1, tasks: [{ slug: 'hero', decision: 'approve' }] });
  });

  it('merges into an existing file by slug rather than overwriting it', async () => {
    await writeRoundSelection(root, 1, [{ slug: 'hero', decision: 'skip' }], 'a');
    await writeRoundSelection(root, 1, [{ slug: 'about', decision: 'skip' }], 'b');
    await writeRoundSelection(
      root,
      1,
      [{ slug: 'hero', decision: 'approve', keeper: 'hero-01.png' }],
      'c',
    );

    const result = await readRoundSelection(root, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.selectedAt).toBe('c');
    expect(result.value.tasks).toEqual([
      { slug: 'hero', decision: 'approve', keeper: 'hero-01.png' },
      { slug: 'about', decision: 'skip' },
    ]);
  });
});

describe('approved/ promotion', () => {
  beforeEach(async () => {
    await put('rounds/r1/hero-01.png', 'png-bytes');
  });

  it('copies a keeper into approved/, creating the directory', async () => {
    expect(await promoteApproved(root, 1, 'hero-01.png')).toEqual({ ok: true, value: undefined });

    expect(await readFile(join(root, 'approved/hero-01.png'), 'utf8')).toBe('png-bytes');
  });

  it('fails when the round file is missing', async () => {
    expect(await promoteApproved(root, 1, 'gone.png')).toMatchObject({ ok: false });
  });

  it('reports no conflict when approved/ holds nothing under that name', async () => {
    expect(await approvedConflict(root, 1, 'hero-01.png')).toEqual({ ok: true, value: false });
  });

  it('reports no conflict when the resident file is byte-identical (BI-032)', async () => {
    await promoteApproved(root, 1, 'hero-01.png');

    expect(await approvedConflict(root, 1, 'hero-01.png')).toEqual({ ok: true, value: false });
  });

  it('reports a conflict when a different image already holds the name (BI-032)', async () => {
    await put('approved/hero-01.png', 'a-different-image');

    expect(await approvedConflict(root, 1, 'hero-01.png')).toEqual({ ok: true, value: true });
  });

  it('removes a promoted keeper, and stays silent when there is nothing to remove (BI-030.2)', async () => {
    await promoteApproved(root, 1, 'hero-01.png');

    expect(await removeApproved(root, 'hero-01.png')).toEqual({ ok: true, value: undefined });
    expect(await removeApproved(root, 'hero-01.png')).toEqual({ ok: true, value: undefined });
    expect(await removeApproved(root, 'never-existed.png')).toEqual({ ok: true, value: undefined });
  });
});

describe('suggestRoots', () => {
  it('offers an existing imagegen/ beside the app and inside it, and nothing else', async () => {
    const app = join(workspace, 'repo', 'blastimage');
    await mkdir(app, { recursive: true });

    expect(await suggestRoots(app)).toEqual([join(workspace, 'repo', 'imagegen')]);
    expect(await suggestRoots(join(workspace, 'unrelated'))).toEqual([]);
  });
});
