import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION } from './types';
import {
  addRefImage,
  addTask,
  deleteTask,
  MAX_ACTIVE_REFS,
  newRefImage,
  newSession,
  newTask,
  removeRefImage,
  renameSession,
  renameTask,
  setTaskPrompt,
  toggleTaskRefImage,
} from './workspace';

describe('factories', () => {
  it('newSession creates an empty session at the current schema version', () => {
    const s = newSession('My Site');
    expect(s.name).toBe('My Site');
    expect(s.tasks).toEqual([]);
    expect(s.refLibrary).toEqual([]);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.id).toBeTruthy();
    expect(s.createdAt).toBe(s.updatedAt);
  });

  it('newTask creates a blank task with no prompt, references, or iterations', () => {
    const t = newTask('Hero banner');
    expect(t.name).toBe('Hero banner');
    expect(t.basePrompt).toBe('');
    expect(t.activeRefImageIds).toEqual([]);
    expect(t.iterations).toEqual([]);
    expect(t.id).toBeTruthy();
  });

  it('mints distinct ids', () => {
    expect(newTask('a').id).not.toBe(newTask('b').id);
  });
});

describe('session mutations', () => {
  it('renameSession changes the name without mutating the original', () => {
    const s = newSession('Old');
    const renamed = renameSession(s, 'New');
    expect(renamed.name).toBe('New');
    expect(s.name).toBe('Old'); // immutable
  });

  it('addTask appends without mutating the original', () => {
    const s = newSession('S');
    const t = newTask('T');
    const next = addTask(s, t);
    expect(next.tasks).toHaveLength(1);
    expect(next.tasks[0]).toBe(t);
    expect(s.tasks).toHaveLength(0); // immutable
  });

  it('deleteTask removes by id and is a no-op for unknown ids', () => {
    const t = newTask('T');
    const s = addTask(newSession('S'), t);
    expect(deleteTask(s, t.id).tasks).toHaveLength(0);
    expect(deleteTask(s, 'nope').tasks).toHaveLength(1);
  });

  it('renameTask renames the matching task only', () => {
    const a = newTask('A');
    const b = newTask('B');
    const s = addTask(addTask(newSession('S'), a), b);
    const next = renameTask(s, a.id, 'A2');
    expect(next.tasks.find((t) => t.id === a.id)?.name).toBe('A2');
    expect(next.tasks.find((t) => t.id === b.id)?.name).toBe('B');
  });

  it('setTaskPrompt updates the base prompt of the matching task', () => {
    const t = newTask('T');
    const s = addTask(newSession('S'), t);
    const next = setTaskPrompt(s, t.id, 'a sunset over the ocean');
    expect(next.tasks[0].basePrompt).toBe('a sunset over the ocean');
  });
});

describe('reference library', () => {
  const ref = (name = 'shot.png') =>
    newRefImage(name, 'data:image/png;base64,AAAA', 'image/png', 800, 600);

  it('newRefImage carries the supplied fields plus a fresh id + timestamp', () => {
    const r = newRefImage('hero.jpg', 'data:image/jpeg;base64,ZZ', 'image/jpeg', 1024, 768);
    expect(r.name).toBe('hero.jpg');
    expect(r.dataUrl).toBe('data:image/jpeg;base64,ZZ');
    expect(r.mimeType).toBe('image/jpeg');
    expect(r.width).toBe(1024);
    expect(r.height).toBe(768);
    expect(r.id).toBeTruthy();
    expect(r.addedAt).toBeTruthy();
  });

  it('addRefImage appends to the library without mutating the original', () => {
    const s = newSession('S');
    const r = ref();
    const next = addRefImage(s, r);
    expect(next.refLibrary).toHaveLength(1);
    expect(next.refLibrary[0]).toBe(r);
    expect(s.refLibrary).toHaveLength(0); // immutable
  });

  it('removeRefImage drops it from the library and cascades into tasks', () => {
    const r = ref();
    const t = newTask('T');
    let s = addRefImage(newSession('S'), r);
    s = addTask(s, t);
    s = toggleTaskRefImage(s, t.id, r.id); // task now references r
    expect(s.tasks[0].activeRefImageIds).toContain(r.id);

    const next = removeRefImage(s, r.id);
    expect(next.refLibrary).toHaveLength(0);
    expect(next.tasks[0].activeRefImageIds).not.toContain(r.id);
  });

  it('removeRefImage is a no-op for an unknown id', () => {
    const s = addRefImage(newSession('S'), ref());
    expect(removeRefImage(s, 'nope').refLibrary).toHaveLength(1);
  });

  it('toggleTaskRefImage adds then removes a ref from a task selection', () => {
    const r = ref();
    const t = newTask('T');
    let s = addTask(addRefImage(newSession('S'), r), t);
    s = toggleTaskRefImage(s, t.id, r.id);
    expect(s.tasks[0].activeRefImageIds).toEqual([r.id]);
    s = toggleTaskRefImage(s, t.id, r.id);
    expect(s.tasks[0].activeRefImageIds).toEqual([]);
  });

  it(`toggleTaskRefImage refuses to exceed ${MAX_ACTIVE_REFS} active refs`, () => {
    const refs = Array.from({ length: MAX_ACTIVE_REFS + 1 }, (_, i) => ref(`r${i}.png`));
    const t = newTask('T');
    let s = addTask(newSession('S'), t);
    for (const r of refs) s = addRefImage(s, r);
    for (const r of refs) s = toggleTaskRefImage(s, t.id, r.id);
    // The (MAX+1)-th toggle is a defensive no-op.
    expect(s.tasks[0].activeRefImageIds).toHaveLength(MAX_ACTIVE_REFS);
    expect(s.tasks[0].activeRefImageIds).not.toContain(refs[MAX_ACTIVE_REFS].id);
  });
});
