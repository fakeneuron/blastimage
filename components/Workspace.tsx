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
import { countGeneratedImageBytes, GENERATED_QUOTA_WARN_BYTES } from '@/lib/workspace';
import Sidebar from '@/components/Sidebar';
import TaskDetail from '@/components/TaskDetail';
import BulkReviewPane from '@/components/BulkReviewPane';
import FeedbackModal from '@/components/FeedbackModal';
import GalleryPanel from '@/components/GalleryPanel';
import IterateModal from '@/components/IterateModal';

export default function Workspace() {
  const ws = useWorkspace();
  const [quotaWarningDismissed, setQuotaWarningDismissed] = useState(false);
  // Which image the feedback modal is open for (BI-006), or null when closed.
  const [feedbackFor, setFeedbackFor] = useState<{ taskId: ID; imageId: ID } | null>(null);
  // Which keeper the iterate modal is open for (BI-009), or null when closed.
  const [iterateFor, setIterateFor] = useState<{ taskId: ID; imageId: ID } | null>(null);
  // Tasks fired by Generate All — non-null renders the bulk-review pane (BI-015);
  // selecting a task or switching sessions exits back to TaskDetail.
  const [bulkTaskIds, setBulkTaskIds] = useState<ID[] | null>(null);

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

  const genBytes = ws.session ? countGeneratedImageBytes(ws.session) : 0;

  // Eligibility mirrors generate()'s guard; disabled while any batch is in flight.
  const canGenerateAll =
    ws.generatingTaskIds.length === 0 &&
    ws.session.tasks.some((t) => t.basePrompt.trim() !== '' || t.activeRefImageIds.length > 0);

  // Resolve fired tasks from live session state (session order; deleted tasks drop out).
  const bulkTasks = bulkTaskIds
    ? ws.session.tasks.filter((t) => bulkTaskIds.includes(t.id))
    : null;

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
      {!quotaWarningDismissed && genBytes >= GENERATED_QUOTA_WARN_BYTES && (
        <div className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm text-white">
          <span>
            Generated images are using ~{(genBytes / 1024 / 1024).toFixed(1)}&nbsp;MB of localStorage
            — consider exporting and clearing old sessions before generating more.
          </span>
          <button className="shrink-0 underline" onClick={() => setQuotaWarningDismissed(true)}>
            Dismiss
          </button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          session={ws.session}
          sessions={ws.sessions}
          activeTaskId={ws.activeTaskId}
          canGenerateAll={canGenerateAll}
          onSwitchSession={(id) => {
            setBulkTaskIds(null);
            ws.switchSession(id);
          }}
          onCreateSession={(name) => {
            setBulkTaskIds(null);
            ws.createSession(name);
          }}
          onRenameSession={ws.renameSession}
          onAddTask={ws.addTask}
          onImportTasks={ws.importTasks}
          onSelectTask={(id) => {
            setBulkTaskIds(null);
            ws.selectTask(id);
          }}
          onRenameTask={ws.renameTask}
          onDeleteTask={ws.deleteTask}
          onGenerateAll={() => {
            const fired = ws.generateAll();
            if (fired.length > 0) setBulkTaskIds(fired);
          }}
        />
        {bulkTasks ? (
          <BulkReviewPane
            tasks={bulkTasks}
            generatingTaskIds={ws.generatingTaskIds}
            onSetImageDecision={ws.setImageDecision}
            onSetImageRating={ws.setImageRating}
            onFeedback={(taskId, imageId) => setFeedbackFor({ taskId, imageId })}
            onIterate={(taskId, imageId) => setIterateFor({ taskId, imageId })}
          />
        ) : (
          <TaskDetail
            task={ws.activeTask}
            library={ws.session.refLibrary}
            generating={ws.activeTaskId !== null && ws.generatingTaskIds.includes(ws.activeTaskId)}
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
        )}
        <GalleryPanel approved={ws.approvedImages} onExportAll={ws.exportAll} />
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
