import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION } from './types';
import {
  addTask,
  deleteTask,
  newSession,
  newTask,
  renameSession,
  renameTask,
  setTaskPrompt,
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
