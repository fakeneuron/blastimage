'use client';

/**
 * blastimage — cross-task bulk-review pane (BI-015)
 *
 * Rendered in place of {@link TaskDetail} after "Generate All" fires: every
 * fired task's newest batch stacked in one scrollable pass, one section per
 * task (name + the BI-005 {@link ReviewGrid} with full decision / rating /
 * feedback / iterate controls). Tasks still generating show the same skeleton
 * grid TaskDetail uses. Presentational only — the fired-task set and exit
 * behavior live in Workspace.
 */

import type { ID, PromptTask, ReviewDecision, StarRating } from '@/lib/types';
import { DEFAULT_BATCH_SIZE } from '@/lib/useWorkspace';
import ReviewGrid from '@/components/ReviewGrid';

interface BulkReviewPaneProps {
  /** The tasks fired by Generate All, in session order. */
  tasks: PromptTask[];
  /** Task ids whose batches are still generating. */
  generatingTaskIds: ID[];
  onSetImageDecision: (taskId: ID, imageId: ID, decision: ReviewDecision) => void;
  onSetImageRating: (taskId: ID, imageId: ID, rating: StarRating) => void;
  onFeedback: (taskId: ID, imageId: ID) => void;
  onIterate: (taskId: ID, imageId: ID) => void;
}

export default function BulkReviewPane({
  tasks,
  generatingTaskIds,
  onSetImageDecision,
  onSetImageRating,
  onFeedback,
  onIterate,
}: BulkReviewPaneProps) {
  return (
    <section className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          Bulk review · {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </h2>
        <p className="text-xs opacity-50">Select a task in the sidebar to return to single-task view.</p>
      </div>

      {tasks.map((task) => {
        const generating = generatingTaskIds.includes(task.id);
        const latest = task.iterations.at(-1) ?? null;
        return (
          <div key={task.id} className="flex flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wide opacity-60">
              {task.name}
              {generating
                ? ' · generating…'
                : latest
                  ? ` · round ${latest.index + 1}`
                  : ''}
            </label>
            {generating ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: DEFAULT_BATCH_SIZE }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/2] animate-pulse rounded-lg border border-black/10 bg-foreground/10 dark:border-white/10"
                  />
                ))}
              </div>
            ) : latest ? (
              <ReviewGrid
                iteration={latest}
                onSetDecision={(imageId, decision) => onSetImageDecision(task.id, imageId, decision)}
                onSetRating={(imageId, rating) => onSetImageRating(task.id, imageId, rating)}
                onFeedback={(imageId) => onFeedback(task.id, imageId)}
                onIterate={(imageId) => onIterate(task.id, imageId)}
              />
            ) : (
              // The fired batch never landed (generation failed for this task).
              <p className="text-sm opacity-50">No batch — generation failed for this task.</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
