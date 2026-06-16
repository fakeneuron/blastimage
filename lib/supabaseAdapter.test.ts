/**
 * supabaseAdapter row-mapping tests (BI-022.3).
 *
 * Pins the pure domain ↔ relational-row mapping: a Session flattened to insert
 * rows and reassembled must round-trip exactly, including ordered arrays
 * (ref library, tasks, iterations, images) regardless of the row order the DB
 * returns. No Supabase client is constructed — these are pure functions.
 */

import { describe, expect, it } from 'vitest';

import type { Session } from './types';
import { rowsToSession, sessionToRows } from './supabaseAdapter';

function sampleSession(): Session {
  return {
    id: 'sess-1',
    name: 'My Website',
    schemaVersion: 1,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T01:00:00.000Z',
    refLibrary: [
      {
        id: 'ref-1',
        name: 'logo.png',
        dataUrl: 'data:image/png;base64,AAA',
        mimeType: 'image/png',
        width: 120,
        height: 80,
        addedAt: '2026-06-16T00:10:00.000Z',
      },
      {
        id: 'ref-2',
        name: 'mood.jpg',
        dataUrl: 'data:image/jpeg;base64,BBB',
        mimeType: 'image/jpeg',
        addedAt: '2026-06-16T00:20:00.000Z',
      },
    ],
    tasks: [
      {
        id: 'task-1',
        name: 'Hero',
        basePrompt: 'a hero image',
        activeRefImageIds: ['ref-1'],
        createdAt: '2026-06-16T00:30:00.000Z',
        updatedAt: '2026-06-16T00:40:00.000Z',
        iterations: [
          {
            id: 'iter-1',
            index: 0,
            prompt: 'a hero image',
            refImageIds: ['ref-1'],
            primaryRefImageId: null,
            createdAt: '2026-06-16T00:31:00.000Z',
            images: [
              {
                id: 'img-1',
                url: 'data:image/png;base64,IMG1',
                prompt: 'a hero image',
                status: 'ready',
                decision: 'kept',
                rating: 4,
                feedback: { text: 'brighter', useAsReference: true, updatedAt: '2026-06-16T00:32:00.000Z' },
                createdAt: '2026-06-16T00:31:30.000Z',
              },
              {
                id: 'img-2',
                url: 'data:image/png;base64,IMG2',
                prompt: 'a hero image',
                status: 'ready',
                decision: 'discarded',
                rating: 0,
                feedback: null,
                createdAt: '2026-06-16T00:31:31.000Z',
              },
            ],
          },
          {
            id: 'iter-2',
            index: 1,
            prompt: 'a brighter hero image',
            refImageIds: ['ref-1'],
            primaryRefImageId: 'img-1',
            createdAt: '2026-06-16T00:35:00.000Z',
            images: [
              {
                id: 'img-3',
                url: 'data:image/png;base64,IMG3',
                prompt: 'a brighter hero image',
                status: 'ready',
                decision: 'approved',
                rating: 5,
                feedback: null,
                createdAt: '2026-06-16T00:35:30.000Z',
              },
            ],
          },
        ],
      },
      {
        id: 'task-2',
        name: 'About',
        basePrompt: 'an about photo',
        activeRefImageIds: [],
        createdAt: '2026-06-16T00:45:00.000Z',
        updatedAt: '2026-06-16T00:45:00.000Z',
        iterations: [],
      },
    ],
  };
}

describe('sessionToRows / rowsToSession', () => {
  it('round-trips a session exactly, even with shuffled row order', () => {
    const session = sampleSession();
    const rows = sessionToRows(session);

    // Reverse every child-row array to prove reassembly sorts by its order key.
    const restored = rowsToSession(
      rows.session,
      [...rows.refImages].reverse(),
      [...rows.tasks].reverse(),
      [...rows.iterations].reverse(),
      [...rows.images].reverse(),
    );

    expect(restored).toEqual(session);
  });

  it('flattens children with denormalized session_id and order columns', () => {
    const rows = sessionToRows(sampleSession());

    expect(rows.refImages.map((r) => r.position)).toEqual([0, 1]);
    expect(rows.tasks.map((t) => t.position)).toEqual([0, 1]);
    expect(rows.iterations.map((i) => i.idx)).toEqual([0, 1]);
    expect(rows.images.map((i) => i.position)).toEqual([0, 1, 0]);
    expect(rows.images.every((i) => i.session_id === 'sess-1')).toBe(true);
    expect(rows.iterations.every((i) => i.session_id === 'sess-1')).toBe(true);
    // Optional dimensions: present on ref-1, omitted (null) on ref-2.
    expect(rows.refImages[0].width).toBe(120);
    expect(rows.refImages[1].width).toBeNull();
  });
});
