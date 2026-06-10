import { beforeEach, describe, expect, it } from 'vitest';

import { SCHEMA_VERSION, type Session } from './types';
import {
  deleteSession,
  getActiveSessionId,
  importSession,
  listSessions,
  loadActiveSession,
  loadSession,
  saveSession,
  serializeSession,
  setActiveSessionId,
  slugify,
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

describe('slugify', () => {
  it('lowercases and joins alphanumeric runs with hyphens', () => {
    expect(slugify('My Website')).toBe('my-website');
    expect(slugify('  Hero / Banner #2  ')).toBe('hero-banner-2');
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!!')).toBe('');
  });
});
