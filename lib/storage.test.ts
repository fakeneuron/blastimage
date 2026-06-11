import { beforeEach, describe, expect, it } from 'vitest';

import { SCHEMA_VERSION, type Session } from './types';
import {
  deleteSession,
  getActiveSessionId,
  imageExtension,
  importSession,
  listSessions,
  loadActiveSession,
  loadSession,
  parseTaskImport,
  saveSession,
  serializeSession,
  setActiveSessionId,
  slugify,
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
