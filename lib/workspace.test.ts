import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION } from './types';
import {
  addRefImage,
  addTask,
  appendIteration,
  buildApprovedImages,
  buildExportManifest,
  cloneSessionWithNewIds,
  countGeneratedImageBytes,
  deleteTask,
  importTasks,
  MAX_ACTIVE_REFS,
  newGeneratedImage,
  newRefImage,
  newSession,
  newTask,
  removeRefImage,
  renameSession,
  renameTask,
  setImageDecision,
  setImageFeedback,
  setImageRating,
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

  it('importTasks appends fresh tasks with the drafted prompts, preserving existing ones', () => {
    const existing = newTask('Existing');
    const s = addTask(newSession('S'), existing);
    const next = importTasks(s, [
      { name: 'Hero', basePrompt: 'a flat-vector hero' },
      { name: 'Inline', basePrompt: '' },
    ]);
    expect(next.tasks.map((t) => t.name)).toEqual(['Existing', 'Hero', 'Inline']);
    expect(next.tasks[1].basePrompt).toBe('a flat-vector hero');
    expect(next.tasks[2].basePrompt).toBe('');
    expect(next.tasks[1].iterations).toEqual([]);
    expect(next.tasks[1].id).not.toBe(next.tasks[2].id);
    expect(s.tasks).toHaveLength(1); // immutable
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

describe('generation / iterations', () => {
  const img = (url = 'https://picsum.photos/seed/x-0/768/512', prompt = 'a sunset') =>
    newGeneratedImage(url, prompt);

  it('newGeneratedImage lands ready + undecided with the supplied url/prompt', () => {
    const i = newGeneratedImage('https://example.com/a.jpg', 'a hero shot');
    expect(i.url).toBe('https://example.com/a.jpg');
    expect(i.prompt).toBe('a hero shot');
    expect(i.status).toBe('ready');
    expect(i.decision).toBe('undecided');
    expect(i.rating).toBe(0);
    expect(i.feedback).toBeNull();
    expect(i.id).toBeTruthy();
    expect(i.createdAt).toBeTruthy();
  });

  it('appendIteration appends a round and mints a 0-based index', () => {
    const t = newTask('T');
    const s = addTask(newSession('S'), t);
    const next = appendIteration(s, t.id, {
      prompt: 'a sunset',
      refImageIds: [],
      primaryRefImageId: null,
      images: [img()],
    });
    expect(next.tasks[0].iterations).toHaveLength(1);
    expect(next.tasks[0].iterations[0].index).toBe(0);
    expect(next.tasks[0].iterations[0].prompt).toBe('a sunset');
    expect(next.tasks[0].iterations[0].images).toHaveLength(1);
    expect(s.tasks[0].iterations).toHaveLength(0); // immutable
  });

  it('appendIteration increments the index across rounds and carries the draft fields', () => {
    const t = newTask('T');
    let s = addTask(newSession('S'), t);
    s = appendIteration(s, t.id, {
      prompt: 'round one',
      refImageIds: [],
      primaryRefImageId: null,
      images: [img()],
    });
    s = appendIteration(s, t.id, {
      prompt: 'round two',
      refImageIds: ['ref-a'],
      primaryRefImageId: 'keeper-1',
      images: [img(), img()],
    });
    const its = s.tasks[0].iterations;
    expect(its.map((i) => i.index)).toEqual([0, 1]);
    expect(its[1].refImageIds).toEqual(['ref-a']);
    expect(its[1].primaryRefImageId).toBe('keeper-1');
    expect(its[1].images).toHaveLength(2);
  });

  it('appendIteration is a no-op for an unknown task id', () => {
    const t = newTask('T');
    const s = addTask(newSession('S'), t);
    const next = appendIteration(s, 'nope', {
      prompt: 'x',
      refImageIds: [],
      primaryRefImageId: null,
      images: [img()],
    });
    expect(next).toBe(s);
  });
});

describe('review mutations', () => {
  const img = (url = 'https://picsum.photos/seed/x-0/768/512', prompt = 'a sunset') =>
    newGeneratedImage(url, prompt);

  /** A session with one task that has two iterations of one image each. */
  function seeded() {
    const t = newTask('T');
    const a = img('https://picsum.photos/seed/a/768/512', 'round one');
    const b = img('https://picsum.photos/seed/b/768/512', 'round two');
    let s = addTask(newSession('S'), t);
    s = appendIteration(s, t.id, { prompt: 'r1', refImageIds: [], primaryRefImageId: null, images: [a] });
    s = appendIteration(s, t.id, { prompt: 'r2', refImageIds: [], primaryRefImageId: null, images: [b] });
    return { s, taskId: t.id, a, b };
  }

  it('setImageDecision sets the decision on the targeted image only', () => {
    const { s, taskId, a, b } = seeded();
    const next = setImageDecision(s, taskId, b.id, 'kept');
    expect(next.tasks[0].iterations[1].images[0].decision).toBe('kept');
    expect(next.tasks[0].iterations[0].images[0].decision).toBe('undecided');
    expect(s.tasks[0].iterations[1].images[0].decision).toBe('undecided'); // immutable
    expect(a.decision).toBe('undecided');
  });

  it('setImageDecision can approve and can clear back to undecided', () => {
    const { s, taskId, b } = seeded();
    const approved = setImageDecision(s, taskId, b.id, 'approved');
    expect(approved.tasks[0].iterations[1].images[0].decision).toBe('approved');
    const cleared = setImageDecision(approved, taskId, b.id, 'undecided');
    expect(cleared.tasks[0].iterations[1].images[0].decision).toBe('undecided');
  });

  it('setImageRating sets the rating on the targeted image', () => {
    const { s, taskId, a } = seeded();
    const next = setImageRating(s, taskId, a.id, 4);
    expect(next.tasks[0].iterations[0].images[0].rating).toBe(4);
    expect(s.tasks[0].iterations[0].images[0].rating).toBe(0); // immutable
  });

  it('review mutators bump the task updatedAt', () => {
    const { s, taskId, a } = seeded();
    const before = s.tasks[0].updatedAt;
    const next = setImageRating(s, taskId, a.id, 5);
    expect(next.tasks[0].updatedAt >= before).toBe(true);
    expect(next.updatedAt >= s.updatedAt).toBe(true);
  });

  it('review mutators are a no-op for unknown task or image ids', () => {
    const { s, taskId, a } = seeded();
    expect(setImageDecision(s, 'nope', a.id, 'kept')).toBe(s);
    expect(setImageRating(s, taskId, 'nope', 3)).toBe(s);
  });

  it('setImageFeedback sets a FeedbackState on the targeted image only', () => {
    const { s, taskId, b } = seeded();
    const next = setImageFeedback(s, taskId, b.id, { text: 'warmer light', useAsReference: true });
    const fb = next.tasks[0].iterations[1].images[0].feedback;
    expect(fb?.text).toBe('warmer light');
    expect(fb?.useAsReference).toBe(true);
    expect(fb?.updatedAt).toBeTruthy();
    expect(next.tasks[0].iterations[0].images[0].feedback).toBeNull(); // other image untouched
    expect(s.tasks[0].iterations[1].images[0].feedback).toBeNull(); // immutable
    expect(b.feedback).toBeNull();
  });

  it('setImageFeedback clears feedback back to null', () => {
    const { s, taskId, b } = seeded();
    const withFb = setImageFeedback(s, taskId, b.id, { text: 'x', useAsReference: false });
    const cleared = setImageFeedback(withFb, taskId, b.id, null);
    expect(cleared.tasks[0].iterations[1].images[0].feedback).toBeNull();
  });

  it('setImageFeedback bumps the task updatedAt and no-ops on unknown ids', () => {
    const { s, taskId, a } = seeded();
    const before = s.tasks[0].updatedAt;
    const next = setImageFeedback(s, taskId, a.id, { text: 'note', useAsReference: false });
    expect(next.tasks[0].updatedAt >= before).toBe(true);
    expect(setImageFeedback(s, 'nope', a.id, { text: 'x', useAsReference: false })).toBe(s);
    expect(setImageFeedback(s, taskId, 'nope', { text: 'x', useAsReference: false })).toBe(s);
  });
});

describe('countGeneratedImageBytes', () => {
  it('returns 0 for a session with no tasks', () => {
    expect(countGeneratedImageBytes(newSession('S'))).toBe(0);
  });

  it('returns 0 for a session with tasks but no iterations', () => {
    const s = addTask(newSession('S'), newTask('T'));
    expect(countGeneratedImageBytes(s)).toBe(0);
  });

  it('sums the lengths of data-URL images only, ignoring remote URLs', () => {
    const dataUrl = 'data:image/png;base64,ABCD'; // length = 26
    const remoteUrl = 'https://picsum.photos/seed/x/1'; // should be ignored
    const t = newTask('T');
    let s = addTask(newSession('S'), t);
    s = appendIteration(s, t.id, {
      prompt: 'p',
      refImageIds: [],
      primaryRefImageId: null,
      images: [
        newGeneratedImage(dataUrl, 'p'),
        newGeneratedImage(remoteUrl, 'p'),
      ],
    });
    expect(countGeneratedImageBytes(s)).toBe(dataUrl.length);
  });

  it('accumulates bytes across multiple tasks and iterations', () => {
    const url1 = 'data:image/png;base64,AAAA'; // 26
    const url2 = 'data:image/jpeg;base64,BBBBBB'; // 30
    const t1 = newTask('T1');
    const t2 = newTask('T2');
    let s = addTask(addTask(newSession('S'), t1), t2);
    s = appendIteration(s, t1.id, { prompt: 'p', refImageIds: [], primaryRefImageId: null, images: [newGeneratedImage(url1, 'p')] });
    s = appendIteration(s, t2.id, { prompt: 'p', refImageIds: [], primaryRefImageId: null, images: [newGeneratedImage(url2, 'p')] });
    expect(countGeneratedImageBytes(s)).toBe(url1.length + url2.length);
  });
});

describe('gallery derivations', () => {
  function makeImg(url: string, prompt: string) {
    return newGeneratedImage(url, prompt);
  }

  /** Session with two tasks, each with two iterations. Some images are approved. */
  function seeded() {
    const t1 = newTask('Hero');
    const t2 = newTask('Logo');
    const img1 = makeImg('https://picsum.photos/seed/a/1', 'hero v1');
    const img2 = makeImg('https://picsum.photos/seed/b/1', 'hero v2');
    const img3 = makeImg('https://picsum.photos/seed/c/1', 'logo v1');

    let s = addTask(newSession('S'), t1);
    s = addTask(s, t2);
    s = appendIteration(s, t1.id, { prompt: 'hero r1', refImageIds: [], primaryRefImageId: null, images: [img1] });
    s = appendIteration(s, t1.id, { prompt: 'hero r2', refImageIds: ['ref-x'], primaryRefImageId: null, images: [img2] });
    s = appendIteration(s, t2.id, { prompt: 'logo r1', refImageIds: [], primaryRefImageId: null, images: [img3] });

    s = setImageDecision(s, t1.id, img1.id, 'approved');
    s = setImageDecision(s, t1.id, img2.id, 'kept');
    s = setImageDecision(s, t2.id, img3.id, 'approved');

    return { s, t1, t2, img1, img2, img3 };
  }

  it('buildApprovedImages returns only approved images across all tasks in order', () => {
    const { s, t1, t2, img1, img3 } = seeded();
    const approved = buildApprovedImages(s);
    expect(approved).toHaveLength(2);
    expect(approved[0].imageId).toBe(img1.id);
    expect(approved[0].taskId).toBe(t1.id);
    expect(approved[0].taskName).toBe('Hero');
    expect(approved[1].imageId).toBe(img3.id);
    expect(approved[1].taskId).toBe(t2.id);
  });

  it('buildApprovedImages returns an empty array for a session with no approvals', () => {
    const s = addTask(newSession('Empty'), newTask('T'));
    expect(buildApprovedImages(s)).toEqual([]);
  });

  it('buildApprovedImages accumulates promptHistory across iterations', () => {
    const { s, t1, img2 } = seeded();
    // img2 is 'kept' — also approve it so we can test multi-iteration promptHistory
    const s2 = setImageDecision(s, t1.id, img2.id, 'approved');
    const approved = buildApprovedImages(s2);
    const heroApproved = approved.filter((a) => a.taskId === t1.id);
    // img1 is in iteration 0 → promptHistory = ['hero r1']
    expect(heroApproved[0].promptHistory).toEqual(['hero r1']);
    // img2 is in iteration 1 → promptHistory = ['hero r1', 'hero r2']
    expect(heroApproved[1].promptHistory).toEqual(['hero r1', 'hero r2']);
  });

  it('buildExportManifest includes session metadata and approved images', () => {
    const { s } = seeded();
    const manifest = buildExportManifest(s);
    expect(manifest.sessionId).toBe(s.id);
    expect(manifest.sessionName).toBe('S');
    expect(manifest.approved).toHaveLength(2);
    expect(manifest.exportedAt).toBeTruthy();
  });

  it('buildExportManifest includes only references used in approved images', () => {
    const ref = newRefImage('brand.png', 'data:image/png;base64,abc', 'image/png');
    const { s, t1, img2 } = seeded();
    // Add ref to library and approve img2 (which is in the iteration with ref-x).
    // For simplicity: use the ref from the library that matches an approved iteration.
    let s2 = addRefImage(s, ref);
    // Approve img2 (iteration with refImageIds=['ref-x']); ref.id ≠ 'ref-x' so references = []
    s2 = setImageDecision(s2, t1.id, img2.id, 'approved');
    const manifest = buildExportManifest(s2);
    expect(manifest.references).toEqual([]);

    // Now approve an image whose iteration references our real ref id
    const t3 = newTask('T3');
    const img4 = makeImg('https://picsum.photos/seed/d/1', 'with ref');
    let s3 = addTask(addRefImage(newSession('S3'), ref), t3);
    s3 = appendIteration(s3, t3.id, { prompt: 'p', refImageIds: [ref.id], primaryRefImageId: null, images: [img4] });
    s3 = setImageDecision(s3, t3.id, img4.id, 'approved');
    const m3 = buildExportManifest(s3);
    expect(m3.references).toHaveLength(1);
    expect(m3.references[0].id).toBe(ref.id);
  });
});

describe('cloneSessionWithNewIds (BI-022.7)', () => {
  /** A session with a library ref activated on a task, plus two iterations
   *  where the 2nd is seeded by the 1st's generated image (primaryRefImageId). */
  function sampleSession() {
    const ref = newRefImage('logo.png', 'data:image/png;base64,AAA', 'image/png');
    let s = addRefImage(newSession('Site'), ref);
    const task = newTask('Hero');
    s = addTask(s, task);
    s = toggleTaskRefImage(s, task.id, ref.id); // activeRefImageIds = [ref.id]
    const img0 = newGeneratedImage('data:image/png;base64,IMG0', 'p0');
    s = appendIteration(s, task.id, {
      prompt: 'p0',
      refImageIds: [ref.id],
      primaryRefImageId: null,
      images: [img0],
    });
    s = appendIteration(s, task.id, {
      prompt: 'p1',
      refImageIds: [ref.id],
      primaryRefImageId: img0.id, // promoted prior generated image
      images: [newGeneratedImage('data:image/png;base64,IMG1', 'p1')],
    });
    return { s, refId: ref.id, taskId: task.id, img0Id: img0.id };
  }

  it('re-ids the whole tree and rewrites internal references consistently', () => {
    const { s, refId, taskId, img0Id } = sampleSession();
    const clone = cloneSessionWithNewIds(s);

    // Every id is fresh.
    expect(clone.id).not.toBe(s.id);
    expect(clone.refLibrary[0].id).not.toBe(refId);
    expect(clone.tasks[0].id).not.toBe(taskId);
    expect(clone.tasks[0].iterations[0].images[0].id).not.toBe(img0Id);

    // References point at the cloned ids, not the originals.
    expect(clone.tasks[0].activeRefImageIds).toEqual([clone.refLibrary[0].id]);
    expect(clone.tasks[0].iterations[0].refImageIds).toEqual([clone.refLibrary[0].id]);
    // The 2nd iteration's promoted-image seed maps to the *cloned* 1st image.
    expect(clone.tasks[0].iterations[1].primaryRefImageId).toBe(
      clone.tasks[0].iterations[0].images[0].id,
    );
  });

  it('preserves content and timestamps verbatim (only ids change)', () => {
    const { s } = sampleSession();
    const clone = cloneSessionWithNewIds(s);

    expect(clone.name).toBe(s.name);
    expect(clone.createdAt).toBe(s.createdAt);
    expect(clone.updatedAt).toBe(s.updatedAt);
    expect(clone.refLibrary[0].dataUrl).toBe(s.refLibrary[0].dataUrl);
    expect(clone.tasks[0].iterations.map((it) => it.prompt)).toEqual(['p0', 'p1']);
    expect(clone.tasks[0].iterations[1].images[0].url).toBe('data:image/png;base64,IMG1');
  });
});
