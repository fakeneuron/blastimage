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

import type { ID, PromptTask, Session } from './types';
import {
  listSessions,
  loadActiveSession,
  loadSession,
  saveSession,
  setActiveSessionId,
  type SessionMeta,
} from './storage';
import {
  addTask as addTaskTo,
  deleteTask as deleteTaskFrom,
  newSession,
  newTask,
  renameSession as renameSessionName,
  renameTask as renameTaskName,
  setTaskPrompt as setTaskPromptOn,
} from './workspace';

const DEFAULT_SESSION_NAME = 'My Website';
const DEFAULT_TASK_NAME = 'Untitled task';

export interface UseWorkspace {
  /** False until the mount-time load completes (render a neutral shell while false). */
  ready: boolean;
  session: Session | null;
  sessions: SessionMeta[];
  activeTask: PromptTask | null;
  activeTaskId: ID | null;
  /** Last save failure, or `null`. */
  error: string | null;
  createSession: (name: string) => void;
  switchSession: (id: ID) => void;
  renameSession: (name: string) => void;
  addTask: (name: string) => void;
  renameTask: (taskId: ID, name: string) => void;
  deleteTask: (taskId: ID) => void;
  setTaskPrompt: (taskId: ID, basePrompt: string) => void;
  selectTask: (taskId: ID) => void;
  dismissError: () => void;
}

export function useWorkspace(): UseWorkspace {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<ID | null>(null);
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

  function selectTask(taskId: ID): void {
    setActiveTaskId(taskId);
  }

  function dismissError(): void {
    setError(null);
  }

  const activeTask = session?.tasks.find((t) => t.id === activeTaskId) ?? null;

  return {
    ready,
    session,
    sessions,
    activeTask,
    activeTaskId,
    error,
    createSession,
    switchSession,
    renameSession,
    addTask,
    renameTask,
    deleteTask,
    setTaskPrompt,
    selectTask,
    dismissError,
  };
}
