'use client';

/**
 * blastimage — workspace React hook (BI-003)
 *
 * Binds the pure {@link import('./workspace')} mutations to React state and the
 * BI-002 {@link import('./storage')} persistence layer. On mount it loads the
 * active session (bootstrapping a default one if storage is empty), and every
 * mutator applies a pure transform, persists the result, and surfaces a
 * save failure (quota / unavailable) via {@link UseWorkspace.error} instead of
 * throwing.
 *
 * `activeTaskId` is UI-only selection state — the model has no "active task"
 * field — so it is not persisted and resets to the first task on a session
 * switch.
 */

import { useEffect, useState } from 'react';

import type { ApprovedImage, ID, PromptTask, RefImage, ReviewDecision, Session, StarRating } from './types';
import {
  listSessions,
  loadActiveSession,
  loadSession,
  saveSession,
  setActiveSessionId,
  type SessionMeta,
} from './storage';
import {
  addRefImage as addRefImageTo,
  addTask as addTaskTo,
  appendIteration as appendIterationTo,
  buildApprovedImages,
  buildExportManifest,
  deleteTask as deleteTaskFrom,
  newGeneratedImage,
  newSession,
  newTask,
  removeRefImage as removeRefImageFrom,
  renameSession as renameSessionName,
  renameTask as renameTaskName,
  setImageDecision as setImageDecisionOn,
  setImageFeedback as setImageFeedbackOn,
  setImageRating as setImageRatingOn,
  setTaskPrompt as setTaskPromptOn,
  toggleTaskRefImage as toggleTaskRefImageOn,
} from './workspace';
import { generateBatch } from './generate';
import type { BatchSize } from './types';

const DEFAULT_SESSION_NAME = 'My Website';
const DEFAULT_TASK_NAME = 'Untitled task';
const DEFAULT_BATCH_SIZE: BatchSize = 4;

export interface UseWorkspace {
  /** False until the mount-time load completes (render a neutral shell while false). */
  ready: boolean;
  session: Session | null;
  sessions: SessionMeta[];
  activeTask: PromptTask | null;
  activeTaskId: ID | null;
  /** Task id whose batch is currently being generated, or `null` (transient; not persisted). */
  generatingTaskId: ID | null;
  /** Last save/generation failure, or `null`. */
  error: string | null;
  /** Approved images derived live from the session; used by the gallery panel (BI-008). */
  approvedImages: ApprovedImage[];
  createSession: (name: string) => void;
  switchSession: (id: ID) => void;
  renameSession: (name: string) => void;
  addTask: (name: string) => void;
  renameTask: (taskId: ID, name: string) => void;
  deleteTask: (taskId: ID) => void;
  setTaskPrompt: (taskId: ID, basePrompt: string) => void;
  /**
   * Generates a batch for a task and appends it as a new iteration. `opts.prompt`
   * overrides the task's base prompt (a refined prompt from the review loop);
   * `opts.primaryRefImageId` records a keeper promoted to the round's primary
   * reference. References are optional — generation runs from prompt and/or
   * reference and never requires one.
   */
  generate: (taskId: ID, opts?: { prompt?: string; primaryRefImageId?: ID }) => Promise<void>;
  selectTask: (taskId: ID) => void;
  /** Sets a generated image's review decision (pass `'undecided'` to clear). */
  setImageDecision: (taskId: ID, imageId: ID, decision: ReviewDecision) => void;
  /** Sets a generated image's star rating (`0` = unrated). */
  setImageRating: (taskId: ID, imageId: ID, rating: StarRating) => void;
  /**
   * Saves an image's feedback and, per the modal action, optionally promotes its
   * decision in the same atomic commit (BI-006): `'save'` persists feedback only,
   * `'keep'` also sets the decision to `kept`, `'approve'` to `approved`.
   */
  submitFeedback: (
    taskId: ID,
    imageId: ID,
    feedback: { text: string; useAsReference: boolean },
    action: 'save' | 'keep' | 'approve',
  ) => void;
  addRefImage: (ref: RefImage) => void;
  removeRefImage: (refId: ID) => void;
  toggleTaskRef: (taskId: ID, refId: ID) => void;
  dismissError: () => void;
  /** Downloads the full provenance manifest as a JSON file. */
  exportAll: () => void;
}

export function useWorkspace(): UseWorkspace {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<ID | null>(null);
  const [generatingTaskId, setGeneratingTaskId] = useState<ID | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mount-time load: restore the active session, or bootstrap + persist a default.
  useEffect(() => {
    const existing = loadActiveSession();
    if (existing) {
      setSession(existing);
      setSessions(listSessions());
      setActiveTaskId(existing.tasks[0]?.id ?? null);
      setReady(true);
      return;
    }
    const fresh = newSession(DEFAULT_SESSION_NAME);
    const res = saveSession(fresh);
    if (res.ok) {
      setActiveSessionId(fresh.id);
      setSession(fresh);
      setSessions(listSessions());
    } else {
      // Storage unavailable: keep the session in memory so the UI still works.
      setSession(fresh);
      setError(res.error);
    }
    setReady(true);
  }, []);

  /** Persists a mutated session and reflects it in state, or records the failure. */
  function commit(next: Session): void {
    const res = saveSession(next);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setSession(next);
    setSessions(listSessions());
  }

  function createSession(name: string): void {
    const fresh = newSession(name.trim() || DEFAULT_SESSION_NAME);
    const res = saveSession(fresh);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setActiveSessionId(fresh.id);
    setError(null);
    setSession(fresh);
    setSessions(listSessions());
    setActiveTaskId(null);
  }

  function switchSession(id: ID): void {
    const loaded = loadSession(id);
    if (!loaded) return;
    setActiveSessionId(id);
    setSession(loaded);
    setActiveTaskId(loaded.tasks[0]?.id ?? null);
  }

  function renameSession(name: string): void {
    if (!session) return;
    commit(renameSessionName(session, name.trim() || session.name));
  }

  function addTask(name: string): void {
    if (!session) return;
    const task = newTask(name.trim() || DEFAULT_TASK_NAME);
    commit(addTaskTo(session, task));
    setActiveTaskId(task.id);
  }

  function renameTask(taskId: ID, name: string): void {
    if (!session) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    commit(renameTaskName(session, taskId, trimmed));
  }

  function deleteTask(taskId: ID): void {
    if (!session) return;
    const next = deleteTaskFrom(session, taskId);
    commit(next);
    if (activeTaskId === taskId) setActiveTaskId(next.tasks[0]?.id ?? null);
  }

  function setTaskPrompt(taskId: ID, basePrompt: string): void {
    if (!session) return;
    commit(setTaskPromptOn(session, taskId, basePrompt));
  }

  async function generate(
    taskId: ID,
    opts?: { prompt?: string; primaryRefImageId?: ID },
  ): Promise<void> {
    if (!session) return;
    const task = session.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const prompt = (opts?.prompt ?? task.basePrompt).trim();
    const primaryRefImageId = opts?.primaryRefImageId ?? null;
    // References are optional, but a round needs a prompt or at least one reference.
    const hasRef = primaryRefImageId !== null || task.activeRefImageIds.length > 0;
    if (!prompt && !hasRef) return;

    setGeneratingTaskId(taskId);
    try {
      const referenceSeeds = [
        ...(primaryRefImageId ? [primaryRefImageId] : []),
        ...task.activeRefImageIds,
      ];
      const candidates = await generateBatch({
        prompt,
        batchSize: DEFAULT_BATCH_SIZE,
        referenceSeeds,
      });
      const images = candidates.map((c) => newGeneratedImage(c.url, c.prompt));
      commit(
        appendIterationTo(session, taskId, {
          prompt,
          refImageIds: task.activeRefImageIds,
          primaryRefImageId,
          images,
        }),
      );
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setGeneratingTaskId(null);
    }
  }

  function selectTask(taskId: ID): void {
    setActiveTaskId(taskId);
  }

  function setImageDecision(taskId: ID, imageId: ID, decision: ReviewDecision): void {
    if (!session) return;
    commit(setImageDecisionOn(session, taskId, imageId, decision));
  }

  function setImageRating(taskId: ID, imageId: ID, rating: StarRating): void {
    if (!session) return;
    commit(setImageRatingOn(session, taskId, imageId, rating));
  }

  function submitFeedback(
    taskId: ID,
    imageId: ID,
    feedback: { text: string; useAsReference: boolean },
    action: 'save' | 'keep' | 'approve',
  ): void {
    if (!session) return;
    // Compose on the fresh session so feedback + decision land in one commit.
    let next = setImageFeedbackOn(session, taskId, imageId, feedback);
    if (action === 'keep') next = setImageDecisionOn(next, taskId, imageId, 'kept');
    else if (action === 'approve') next = setImageDecisionOn(next, taskId, imageId, 'approved');
    commit(next);
  }

  function addRefImage(ref: RefImage): void {
    if (!session) return;
    commit(addRefImageTo(session, ref));
  }

  function removeRefImage(refId: ID): void {
    if (!session) return;
    commit(removeRefImageFrom(session, refId));
  }

  function toggleTaskRef(taskId: ID, refId: ID): void {
    if (!session) return;
    commit(toggleTaskRefImageOn(session, taskId, refId));
  }

  function dismissError(): void {
    setError(null);
  }

  const activeTask = session?.tasks.find((t) => t.id === activeTaskId) ?? null;
  const approvedImages = session ? buildApprovedImages(session) : [];

  function exportAll(): void {
    if (!session) return;
    const manifest = buildExportManifest(session);
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/\s+/g, '-').toLowerCase()}-export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    ready,
    session,
    sessions,
    activeTask,
    activeTaskId,
    generatingTaskId,
    error,
    approvedImages,
    createSession,
    switchSession,
    renameSession,
    addTask,
    renameTask,
    deleteTask,
    setTaskPrompt,
    generate,
    selectTask,
    setImageDecision,
    setImageRating,
    submitFeedback,
    addRefImage,
    removeRefImage,
    toggleTaskRef,
    dismissError,
    exportAll,
  };
}
