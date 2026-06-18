import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listAvailableRounds, readRoundBatch } from './imagegenFs';
import { ROUND_BATCH_SCHEMA_VERSION } from './roundBatch';

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

function fakeFile(name: string, contents: string): FileSystemFileHandle {
  const file = new File([contents], name, { type: 'application/json' });
  return {
    kind: 'file',
    name,
    getFile: async () => file,
  } as unknown as FileSystemFileHandle;
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