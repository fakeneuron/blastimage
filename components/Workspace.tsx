'use client';

/**
 * blastimage — workspace root (BI-003)
 *
 * Client island that owns the {@link useWorkspace} hook and lays out the
 * two-column shell: {@link Sidebar} (session switcher + task list) beside
 * {@link TaskDetail} (the active task). Renders a neutral shell until the
 * mount-time load completes, and a dismissible banner on a save failure.
 */

import { useState } from 'react';

import type { ID } from '@/lib/types';
import { useWorkspace } from '@/lib/useWorkspace';
import Sidebar from '@/components/Sidebar';
import TaskDetail from '@/components/TaskDetail';
import FeedbackModal from '@/components/FeedbackModal';
import IterateModal from '@/components/IterateModal';

export default function Workspace() {
  const ws = useWorkspace();
  // Which image the feedback modal is open for (BI-006), or null when closed.
  const [feedbackFor, setFeedbackFor] = useState<{ taskId: ID; imageId: ID } | null>(null);
  // Which keeper the iterate modal is open for (BI-009), or null when closed.
  const [iterateFor, setIterateFor] = useState<{ taskId: ID; imageId: ID } | null>(null);

  // Resolve the open image from current session state so it reflects live edits.
  const feedbackImage = feedbackFor
    ? (ws.session?.tasks
        .find((t) => t.id === feedbackFor.taskId)
        ?.iterations.flatMap((it) => it.images)
        .find((img) => img.id === feedbackFor.imageId) ?? null)
    : null;

  // Resolve the keeper + its task's base prompt for the iterate modal prefill.
  const iterateTask = iterateFor
    ? (ws.session?.tasks.find((t) => t.id === iterateFor.taskId) ?? null)
    : null;
  const iterateImage = iterateTask
    ? (iterateTask.iterations
        .flatMap((it) => it.images)
        .find((img) => img.id === iterateFor!.imageId) ?? null)
    : null;

  if (!ws.ready || !ws.session) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="text-sm opacity-50">Loading workspace…</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      {ws.error && (
        <div className="flex items-center justify-between gap-4 bg-red-600 px-4 py-2 text-sm text-white">
          <span>{ws.error}</span>
          <button className="shrink-0 underline" onClick={ws.dismissError}>
            Dismiss
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          session={ws.session}
          sessions={ws.sessions}
          activeTaskId={ws.activeTaskId}
          onSwitchSession={ws.switchSession}
          onCreateSession={ws.createSession}
          onRenameSession={ws.renameSession}
          onAddTask={ws.addTask}
          onSelectTask={ws.selectTask}
          onRenameTask={ws.renameTask}
          onDeleteTask={ws.deleteTask}
        />
        <TaskDetail
          task={ws.activeTask}
          library={ws.session.refLibrary}
          generating={ws.activeTaskId !== null && ws.generatingTaskId === ws.activeTaskId}
          onRenameTask={ws.renameTask}
          onSetPrompt={ws.setTaskPrompt}
          onAddRefImage={ws.addRefImage}
          onRemoveRefImage={ws.removeRefImage}
          onToggleRef={ws.toggleTaskRef}
          onGenerate={ws.generate}
          onSetImageDecision={ws.setImageDecision}
          onSetImageRating={ws.setImageRating}
          onFeedback={(taskId, imageId) => setFeedbackFor({ taskId, imageId })}
          onIterate={(taskId, imageId) => setIterateFor({ taskId, imageId })}
        />
      </div>
      {feedbackFor && feedbackImage && (
        <FeedbackModal
          image={feedbackImage}
          onClose={() => setFeedbackFor(null)}
          onSubmit={(feedback, action) => {
            ws.submitFeedback(feedbackFor.taskId, feedbackFor.imageId, feedback, action);
            setFeedbackFor(null);
          }}
        />
      )}
      {iterateFor && iterateImage && (
        <IterateModal
          image={iterateImage}
          basePrompt={iterateTask?.basePrompt ?? ''}
          onClose={() => setIterateFor(null)}
          onSubmit={(prompt) => {
            ws.generate(iterateFor.taskId, { prompt, primaryRefImageId: iterateFor.imageId });
            setIterateFor(null);
          }}
        />
      )}
    </main>
  );
}
