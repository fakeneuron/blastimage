/**
 * supabaseAdapter row-mapping tests (BI-022.3; image buckets BI-022.4).
 *
 * Pins the pure domain ↔ relational-row mapping: a Session flattened to insert
 * rows and reassembled must round-trip exactly, including ordered arrays
 * (ref library, tasks, iterations, images) regardless of the row order the DB
 * returns. Image bytes are not in the rows (they live in the bucket); rows
 * carry a `storage_path` and reassembly takes an injected URL resolver, so the
 * mapping stays client-free. Also pins the data-URL → Blob decode. No Supabase
 * client is constructed — these are pure functions.
 */

import { describe, expect, it } from 'vitest';

import type { Session } from './types';
import { dataUrlToBlob, rowsToSession, sessionToRows } from './supabaseAdapter';

const OWNER = 'owner-1';

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
    const rows = sessionToRows(session, OWNER);

    // Image bytes are uploaded to the bucket, not stored in rows; the resolver
    // stands in for signed-URL minting by mapping a storage_path back to the
    // original url/dataUrl via the image id (the path's last segment).
    const urlById = new Map<string, string>([
      ...session.refLibrary.map((r) => [r.id, r.dataUrl] as const),
      ...session.tasks.flatMap((t) =>
        t.iterations.flatMap((it) => it.images.map((img) => [img.id, img.url] as const)),
      ),
    ]);
    const resolve = (path: string): string => urlById.get(path.split('/').pop() ?? '') ?? '';

    // Reverse every child-row array to prove reassembly sorts by its order key.
    const restored = rowsToSession(
      rows.session,
      [...rows.refImages].reverse(),
      [...rows.tasks].reverse(),
      [...rows.iterations].reverse(),
      [...rows.images].reverse(),
      resolve,
    );

    expect(restored).toEqual(session);
  });

  it('flattens children with denormalized session_id, order columns, and owner-prefixed storage paths', () => {
    const rows = sessionToRows(sampleSession(), OWNER);

    expect(rows.refImages.map((r) => r.position)).toEqual([0, 1]);
    expect(rows.tasks.map((t) => t.position)).toEqual([0, 1]);
    expect(rows.iterations.map((i) => i.idx)).toEqual([0, 1]);
    expect(rows.images.map((i) => i.position)).toEqual([0, 1, 0]);
    expect(rows.images.every((i) => i.session_id === 'sess-1')).toBe(true);
    expect(rows.iterations.every((i) => i.session_id === 'sess-1')).toBe(true);
    // Optional dimensions: present on ref-1, omitted (null) on ref-2.
    expect(rows.refImages[0].width).toBe(120);
    expect(rows.refImages[1].width).toBeNull();
    // Storage paths are deterministic: {owner}/{session_id}/{image_id}.
    expect(rows.refImages[0].storage_path).toBe('owner-1/sess-1/ref-1');
    expect(rows.images[2].storage_path).toBe('owner-1/sess-1/img-3');
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a base64 data URL into a typed blob', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,aGVsbG8=');
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('hello');
  });

  it('defaults the content type when the header omits a mime', async () => {
    const blob = dataUrlToBlob('data:;base64,aGk=');
    expect(blob.type).toBe('application/octet-stream');
    expect(await blob.text()).toBe('hi');
  });
});
