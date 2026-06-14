import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SCHEMA_VERSION, type ApprovedImage, type ExportManifest, type Session } from './types';
import {
  deleteSession,
  downloadManifestBundle,
  exportManifestToFolder,
  getActiveSessionId,
  imageExtension,
  importSession,
  listSessions,
  loadActiveSession,
  loadSession,
  parsePastedPrompts,
  parseTaskImport,
  saveSession,
  serializeSession,
  serializeTaskImport,
  setActiveSessionId,
  slugify,
  supportsDirectoryPicker,
  TASK_IMPORT_VERSION,
} from './storage';

function makeSession(overrides: Partial<Session> = {}): Session {
  const now = '2026-06-06T00:00:00.000Z';
  return {
    id: 's1',
    name: 'Demo Site',
    tasks: [],
    refLibrary: [],
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('save / load round-trip', () => {
  it('restores a saved session unchanged', () => {
    const session = makeSession();
    const res = saveSession(session);
    expect(res.ok).toBe(true);
    expect(loadSession(session.id)).toEqual(session);
  });

  it('indexes multiple named sessions via listSessions', () => {
    saveSession(makeSession({ id: 'a', name: 'A' }));
    saveSession(makeSession({ id: 'b', name: 'B' }));
    const ids = listSessions()
      .map((m) => m.id)
      .sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('upserts (does not duplicate) the index entry on re-save', () => {
    saveSession(makeSession({ id: 'a', name: 'First' }));
    saveSession(makeSession({ id: 'a', name: 'Renamed' }));
    const metas = listSessions();
    expect(metas).toHaveLength(1);
    expect(metas[0].name).toBe('Renamed');
  });
});

describe('load guards', () => {
  it('returns null on schemaVersion mismatch', () => {
    const session = makeSession({ schemaVersion: SCHEMA_VERSION + 1 });
    saveSession(session);
    expect(loadSession(session.id)).toBeNull();
  });

  it('returns null on corrupt stored JSON', () => {
    localStorage.setItem('blastimage:session:bad', '{ not valid json');
    expect(loadSession('bad')).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(loadSession('nope')).toBeNull();
  });
});

describe('active-session pointer', () => {
  it('sets, gets, and loads the active session', () => {
    const session = makeSession({ id: 'active1' });
    saveSession(session);
    setActiveSessionId(session.id);
    expect(getActiveSessionId()).toBe('active1');
    expect(loadActiveSession()).toEqual(session);
  });

  it('clears the active pointer when the active session is deleted', () => {
    const session = makeSession({ id: 'x' });
    saveSession(session);
    setActiveSessionId('x');
    deleteSession('x');
    expect(getActiveSessionId()).toBeNull();
    expect(listSessions()).toEqual([]);
  });
});

describe('export / import', () => {
  it('round-trips through serialize + import', () => {
    const session = makeSession();
    expect(importSession(serializeSession(session))).toEqual({ ok: true, value: session });
  });

  it('rejects non-JSON input', () => {
    expect(importSession('not json').ok).toBe(false);
  });

  it('rejects JSON that is not a session', () => {
    expect(importSession(JSON.stringify({ foo: 'bar' })).ok).toBe(false);
  });

  it('rejects a backup with an unsupported schema version', () => {
    expect(importSession(serializeSession(makeSession({ schemaVersion: 999 }))).ok).toBe(false);
  });
});

describe('parseTaskImport', () => {
  const valid = {
    version: TASK_IMPORT_VERSION,
    tasks: [
      { name: 'pressure-injuries — hero', basePrompt: 'A flat-vector body map…' },
      { name: 'pressure-relief — hero', basePrompt: '' },
    ],
  };

  it('parses a valid file into drafts', () => {
    expect(parseTaskImport(JSON.stringify(valid))).toEqual({ ok: true, value: valid.tasks });
  });

  it('trims task names', () => {
    const res = parseTaskImport(
      JSON.stringify({ version: 1, tasks: [{ name: '  Hero  ', basePrompt: 'p' }] }),
    );
    expect(res).toEqual({ ok: true, value: [{ name: 'Hero', basePrompt: 'p' }] });
  });

  it('rejects non-JSON input', () => {
    expect(parseTaskImport('not json').ok).toBe(false);
  });

  it('rejects JSON without a tasks array', () => {
    expect(parseTaskImport(JSON.stringify({ version: 1 })).ok).toBe(false);
  });

  it('rejects an unsupported version', () => {
    expect(parseTaskImport(JSON.stringify({ ...valid, version: 999 })).ok).toBe(false);
  });

  it('rejects an empty tasks array', () => {
    expect(parseTaskImport(JSON.stringify({ version: 1, tasks: [] })).ok).toBe(false);
  });

  it('rejects entries with a blank name or non-string basePrompt', () => {
    expect(
      parseTaskImport(JSON.stringify({ version: 1, tasks: [{ name: '  ', basePrompt: 'p' }] })).ok,
    ).toBe(false);
    expect(
      parseTaskImport(JSON.stringify({ version: 1, tasks: [{ name: 'Hero', basePrompt: 7 }] })).ok,
    ).toBe(false);
  });
});

describe('parsePastedPrompts', () => {
  it('splits blank-line-separated blocks into auto-named drafts', () => {
    expect(parsePastedPrompts('First prompt.\n\nSecond prompt.')).toEqual([
      { name: 'Task 1', basePrompt: 'First prompt.' },
      { name: 'Task 2', basePrompt: 'Second prompt.' },
    ]);
  });

  it('preserves inner line breaks within a block', () => {
    expect(parsePastedPrompts('A serene forest,\nsoft golden light.')).toEqual([
      { name: 'Task 1', basePrompt: 'A serene forest,\nsoft golden light.' },
    ]);
  });

  it('collapses multiple blank lines and drops empty/whitespace blocks', () => {
    expect(parsePastedPrompts('\n\n  \n\nOnly one.\n\n   \n\n')).toEqual([
      { name: 'Task 1', basePrompt: 'Only one.' },
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parsePastedPrompts('   \n\n  ')).toEqual([]);
  });
});

describe('serializeTaskImport', () => {
  it('emits a version-1 file that round-trips through parseTaskImport', () => {
    const drafts = [
      { name: 'forest-hero', basePrompt: 'A serene forest at dawn.' },
      { name: 'bodymap-hero', basePrompt: '' },
    ];
    expect(parseTaskImport(serializeTaskImport(drafts))).toEqual({ ok: true, value: drafts });
  });
});

describe('slugify', () => {
  it('lowercases and joins alphanumeric runs with hyphens', () => {
    expect(slugify('My Website')).toBe('my-website');
    expect(slugify('  Hero / Banner #2  ')).toBe('hero-banner-2');
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('imageExtension', () => {
  it('maps known image mime types to their extensions', () => {
    expect(imageExtension('image/png')).toBe('png');
    expect(imageExtension('image/jpeg')).toBe('jpg');
    expect(imageExtension('image/webp')).toBe('webp');
  });

  it('falls back to jpg for unknown or empty mime types', () => {
    expect(imageExtension('image/tiff')).toBe('jpg');
    expect(imageExtension('')).toBe('jpg');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Folder export — File System Access API (BI-021.2)
// ─────────────────────────────────────────────────────────────────────────

function makeManifest(approved: Array<Partial<ApprovedImage>> = []): ExportManifest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sessionId: 's1',
    sessionName: 'Demo Site',
    exportedAt: '2026-06-14T00:00:00.000Z',
    approved: approved.map((a, i) => ({
      imageId: a.imageId ?? `image${i}abcdef`,
      taskId: 't1',
      taskName: a.taskName ?? 'Hero Banner',
      url: a.url ?? `https://example.test/${i}`,
      finalPrompt: 'p',
      promptHistory: [],
      refImageIds: [],
      rating: 0,
      feedback: null,
      approvedAt: '2026-06-14T00:00:00.000Z',
    })),
    references: [],
  };
}

/** A fake directory handle that records every file closed onto it. */
function makeFakeDir() {
  const written: string[] = [];
  const dir = {
    getFileHandle: vi.fn(async (name: string) => ({
      createWritable: async () => ({
        write: async () => {},
        close: async () => {
          written.push(name);
        },
      }),
    })),
  };
  return { dir: dir as unknown as FileSystemDirectoryHandle, written };
}

/** A fetch stub returning an image blob of the given mime per call. */
function stubFetchOk(mime = 'image/png') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ blob: async () => new Blob(['bytes'], { type: mime }) })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
});

describe('supportsDirectoryPicker', () => {
  it('is true only when window.showDirectoryPicker exists', () => {
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    expect(supportsDirectoryPicker()).toBe(false);
    (window as unknown as Record<string, unknown>).showDirectoryPicker = () => {};
    expect(supportsDirectoryPicker()).toBe(true);
  });
});

describe('exportManifestToFolder', () => {
  it('writes manifest.json plus every approved image into the picked dir', async () => {
    const { dir, written } = makeFakeDir();
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi.fn(async () => dir);
    stubFetchOk('image/png');

    const res = await exportManifestToFolder(
      makeManifest([{ taskName: 'Hero Banner', imageId: 'aaaaaaaa1111' }, { taskName: 'About' }]),
    );

    expect(res).toEqual({ status: 'written', images: 2, failedImages: 0 });
    expect(written).toEqual(['manifest.json', 'hero-banner-aaaaaaaa.png', 'about-image1ab.png']);
  });

  it('returns cancelled when the user dismisses the picker', async () => {
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    expect(await exportManifestToFolder(makeManifest([{}]))).toEqual({ status: 'cancelled' });
  });

  it('lands a partial bundle and reports images whose fetch failed', async () => {
    const { dir, written } = makeFakeDir();
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi.fn(async () => dir);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => new Blob(['x'], { type: 'image/png' }) })
      .mockRejectedValueOnce(new Error('CORS'));
    vi.stubGlobal('fetch', fetchMock);

    const res = await exportManifestToFolder(makeManifest([{ taskName: 'Ok' }, { taskName: 'Bad' }]));

    expect(res).toEqual({ status: 'written', images: 1, failedImages: 1 });
    expect(written).toEqual(['manifest.json', 'ok-image0ab.png']);
  });

  it('errors (does not throw) when the picker is unsupported', async () => {
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    const res = await exportManifestToFolder(makeManifest([{}]));
    expect(res.status).toBe('error');
  });
});

describe('downloadManifestBundle', () => {
  it('downloads manifest.json + each approved image and reports fetch failures', async () => {
    const created: string[] = [];
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      created.push(this.download);
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => new Blob(['x'], { type: 'image/png' }) })
      .mockRejectedValueOnce(new Error('CORS'));
    vi.stubGlobal('fetch', fetchMock);

    const failed = await downloadManifestBundle(makeManifest([{ taskName: 'Ok' }, { taskName: 'Bad' }]));

    expect(failed).toBe(1);
    expect(created).toEqual(['manifest.json', 'ok-image0ab.png']);
  });
});
