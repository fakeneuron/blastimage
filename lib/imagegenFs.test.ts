import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listAvailableRounds,
  promoteKeeperToApproved,
  readRoundBatch,
  removeApprovedFile,
  writeRoundSelection,
} from './imagegenFs';
import { ROUND_BATCH_SCHEMA_VERSION } from './roundBatch';
import { buildIterateSelectionTask, parseRoundSelection } from './roundSelection';

/** Minimal fake FSA tree for unit tests. */
function fakeDir(
  entries: Record<string, FileSystemHandle>,
): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name: 'imagegen',
    entries: async function* () {
      for (const [name, handle] of Object.entries(entries)) {
        yield [name, handle] as [string, FileSystemHandle];
      }
    },
    getDirectoryHandle: async (name: string) => {
      const handle = entries[name];
      if (!handle || handle.kind !== 'directory') throw new DOMException('NotFound');
      return handle as FileSystemDirectoryHandle;
    },
    getFileHandle: async (name: string) => {
      const handle = entries[name];
      if (!handle || handle.kind !== 'file') throw new DOMException('NotFound');
      return handle as FileSystemFileHandle;
    },
  } as unknown as FileSystemDirectoryHandle;
}

function fakeFile(name: string, contents: string, mime = 'application/json'): FileSystemFileHandle {
  let data = contents;
  return {
    kind: 'file',
    name,
    getFile: async () => new File([data], name, { type: mime }),
    createWritable: async () => ({
      write: async (chunk: BlobPart) => {
        if (typeof chunk === 'string') data = chunk;
        else if (chunk instanceof ArrayBuffer) data = new TextDecoder().decode(chunk);
        else if (ArrayBuffer.isView(chunk)) data = new TextDecoder().decode(chunk);
        else data = await new Response(chunk as Blob).text();
      },
      close: async () => {},
    }),
  } as unknown as FileSystemFileHandle;
}

function fakeWritableDir(
  entries: Record<string, FileSystemHandle>,
): FileSystemDirectoryHandle {
  const dir = fakeDir(entries);
  const base = dir as ImagegenDirectoryHandle & FileSystemDirectoryHandle;
  base.queryPermission = async () => 'granted';
  base.requestPermission = async () => 'granted';
  base.getDirectoryHandle = async (name: string, opts?: { create?: boolean }) => {
    if (entries[name]) return entries[name] as FileSystemDirectoryHandle;
    if (opts?.create) {
      const created = fakeWritableDir({});
      entries[name] = created;
      return created;
    }
    throw new DOMException('NotFound');
  };
  base.getFileHandle = async (name: string, opts?: { create?: boolean }) => {
    if (entries[name]) return entries[name] as FileSystemFileHandle;
    if (opts?.create) {
      const created = fakeFile(name, '');
      entries[name] = created;
      return created;
    }
    throw new DOMException('NotFound');
  };
  base.removeEntry = async (name: string) => {
    // Mirrors the FSA contract: removing an absent entry throws NotFoundError.
    if (!entries[name]) throw new DOMException('NotFound', 'NotFoundError');
    delete entries[name];
  };
  return base;
}

interface ImagegenDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

describe('imagegenFs round reads', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists round numbers that contain batch.json', async () => {
    const batch = JSON.stringify({
      schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
      round: 1,
      generatedAt: '2026-06-18T00:00:00Z',
      tasks: [
        { slug: 'a', name: 'A', prompt: 'p', images: ['a-001.jpg'] },
      ],
    });
    const r1 = fakeDir({ 'batch.json': fakeFile('batch.json', batch) });
    const r2 = fakeDir({});
    const rounds = fakeDir({ r1, r2, 'notes.txt': fakeFile('notes.txt', '') });
    const root = fakeDir({ rounds });

    expect(await listAvailableRounds(root)).toEqual([1]);
  });

  it('reads and validates a round batch file', async () => {
    const batch = JSON.stringify({
      schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
      round: 4,
      generatedAt: '2026-06-18T00:00:00Z',
      tasks: [
        { slug: 'hero', name: 'Hero', prompt: 'prompt', images: ['hero-001.jpg'] },
      ],
    });
    const roundDir = fakeDir({ 'batch.json': fakeFile('batch.json', batch) });
    const rounds = fakeDir({ r4: roundDir });
    const root = fakeDir({ rounds });

    const out = await readRoundBatch(root, 4);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.tasks[0]!.slug).toBe('hero');
  });

  it('errors when batch.json round disagrees with the folder', async () => {
    const batch = JSON.stringify({
      schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
      round: 1,
      generatedAt: '2026-06-18T00:00:00Z',
      tasks: [
        { slug: 'a', name: 'A', prompt: 'p', images: ['a-001.jpg'] },
      ],
    });
    const roundDir = fakeDir({ 'batch.json': fakeFile('batch.json', batch) });
    const rounds = fakeDir({ r2: roundDir });
    const root = fakeDir({ rounds });

    const out = await readRoundBatch(root, 2);
    expect(out.ok).toBe(false);
  });
});

describe('imagegenFs selection writes', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes selection.json and merges by slug on subsequent writes', async () => {
    const keeper = fakeFile('hero-001.jpg', 'bytes', 'image/jpeg');
    const roundDir = fakeWritableDir({ 'hero-001.jpg': keeper });
    const rounds = fakeWritableDir({ r1: roundDir });
    const root = fakeWritableDir({ rounds });

    const entry = buildIterateSelectionTask('hero', 'hero-001.jpg', 'base', 'base\n\nRefine: crop');
    const first = await writeRoundSelection(root, 1, [entry], '2026-06-18T00:00:00Z');
    expect(first.ok).toBe(true);

    const selHandle = await roundDir.getFileHandle('selection.json');
    const firstText = await selHandle.getFile().then((f) => f.text());
    const parsed = parseRoundSelection(firstText);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.tasks).toHaveLength(1);

    const second = await writeRoundSelection(
      root,
      1,
      [{ slug: 'other', decision: 'approve', keeper: 'other-001.jpg' }],
      '2026-06-18T00:05:00Z',
    );
    expect(second.ok).toBe(true);
    const mergedText = await selHandle.getFile().then((f) => f.text());
    const merged = parseRoundSelection(mergedText);
    expect(merged.ok).toBe(true);
    if (merged.ok) expect(merged.value.tasks).toHaveLength(2);
  });

  it('promotes a keeper image into approved/', async () => {
    const keeper = fakeFile('hero-001.jpg', 'img-bytes', 'image/jpeg');
    const roundDir = fakeWritableDir({ 'hero-001.jpg': keeper });
    const rounds = fakeWritableDir({ r2: roundDir });
    const root = fakeWritableDir({ rounds });

    const out = await promoteKeeperToApproved(root, 2, 'hero-001.jpg');
    expect(out.ok).toBe(true);

    const approvedDir = await root.getDirectoryHandle('approved');
    const promoted = await approvedDir.getFileHandle('hero-001.jpg');
    const text = await promoted.getFile().then((f) => f.text());
    expect(text).toBe('img-bytes');
  });
});

describe('imagegenFs approve removal (BI-030.2)', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes a previously promoted keeper from approved/', async () => {
    const keeper = fakeFile('hero-001.jpg', 'img-bytes', 'image/jpeg');
    const roundDir = fakeWritableDir({ 'hero-001.jpg': keeper });
    const rounds = fakeWritableDir({ r2: roundDir });
    const root = fakeWritableDir({ rounds });

    expect((await promoteKeeperToApproved(root, 2, 'hero-001.jpg')).ok).toBe(true);
    const approvedDir = await root.getDirectoryHandle('approved');
    await expect(approvedDir.getFileHandle('hero-001.jpg')).resolves.toBeDefined();

    const out = await removeApprovedFile(root, 'hero-001.jpg');
    expect(out.ok).toBe(true);
    await expect(approvedDir.getFileHandle('hero-001.jpg')).rejects.toThrow();
  });

  it('leaves sibling approved files untouched', async () => {
    const roundDir = fakeWritableDir({
      'hero-001.jpg': fakeFile('hero-001.jpg', 'a', 'image/jpeg'),
      'hero-002.jpg': fakeFile('hero-002.jpg', 'b', 'image/jpeg'),
    });
    const rounds = fakeWritableDir({ r1: roundDir });
    const root = fakeWritableDir({ rounds });
    await promoteKeeperToApproved(root, 1, 'hero-001.jpg');
    await promoteKeeperToApproved(root, 1, 'hero-002.jpg');

    expect((await removeApprovedFile(root, 'hero-001.jpg')).ok).toBe(true);

    const approvedDir = await root.getDirectoryHandle('approved');
    await expect(approvedDir.getFileHandle('hero-001.jpg')).rejects.toThrow();
    const survivor = await approvedDir.getFileHandle('hero-002.jpg');
    expect(await survivor.getFile().then((f) => f.text())).toBe('b');
  });

  it('succeeds when the file is already gone (repeated clear)', async () => {
    const roundDir = fakeWritableDir({ 'hero-001.jpg': fakeFile('hero-001.jpg', 'a', 'image/jpeg') });
    const rounds = fakeWritableDir({ r1: roundDir });
    const root = fakeWritableDir({ rounds });
    await promoteKeeperToApproved(root, 1, 'hero-001.jpg');

    expect((await removeApprovedFile(root, 'hero-001.jpg')).ok).toBe(true);
    expect((await removeApprovedFile(root, 'hero-001.jpg')).ok).toBe(true);
  });

  it('succeeds when approved/ does not exist at all', async () => {
    const root = fakeWritableDir({ rounds: fakeWritableDir({}) });
    expect((await removeApprovedFile(root, 'hero-001.jpg')).ok).toBe(true);
  });
});