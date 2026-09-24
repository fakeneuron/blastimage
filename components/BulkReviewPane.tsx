'use client';

/**
 * blastimage — cross-task bulk-review pane (BI-015)
 *
 * Rendered in place of {@link TaskDetail} after "Generate All" fires: every
 * fired task's current-round batch stacked in one scrollable pass, one section
 * per task (name + the BI-005 {@link ReviewGrid} with full decision / rating /
 * feedback / iterate controls). Tasks still generating show the same skeleton
 * grid TaskDetail uses. Presentational only — the fired-task set and exit
 * behavior live in Workspace.
 *
 * Progress (BI-060.2): the header counts tasks decided — a landed batch in the
 * round in view with no undecided image — and lists every task as a jump link
 * that scrolls its section into view without leaving bulk review (exit stays
 * the sidebar's). Derived from {@link decisionCounts}, never persisted.
 */

import type { ID, PromptTask, ReviewDecision, StarRating } from '@/lib/types';
import { roundNumberFromImageUrl } from '@/lib/imagegenUrl';
import { DEFAULT_BATCH_SIZE } from '@/lib/useWorkspace';
import { decisionCounts, visibleIteration } from '@/lib/workspace';
import ReviewGrid from '@/components/ReviewGrid';

/** DOM id of a task's section, the target of its header jump link (BI-060.2). */
function sectionId(taskId: ID): string {
  return `bulk-review-${taskId}`;
}

interface BulkReviewPaneProps {
  /** The tasks fired by Generate All, in session order. */
  tasks: PromptTask[];
  /** Task ids whose batches are still generating. */
  generatingTaskIds: ID[];
  /** Terminal round in view (BI-053.4); each grid shows that iteration, else latest. */
  currentRound?: number | null;
  onSetImageDecision: (taskId: ID, imageId: ID, decision: ReviewDecision) => void;
  onSetImageRating: (taskId: ID, imageId: ID, rating: StarRating) => void;
  onFeedback: (taskId: ID, imageId: ID) => void;
  onIterate: (taskId: ID, imageId: ID) => void;
}

export default function BulkReviewPane({
  tasks,
  generatingTaskIds,
  currentRound = null,
  onSetImageDecision,
  onSetImageRating,
  onFeedback,
  onIterate,
}: BulkReviewPaneProps) {
  const progress = tasks.map((task) => {
    const generating = generatingTaskIds.includes(task.id);
    const counts = generating ? null : decisionCounts(task, currentRound);
    return { task, counts, decided: counts !== null && counts.undecided === 0 };
  });
  const decidedCount = progress.filter((p) => p.decided).length;

  return (
    <section className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          Bulk review · {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </h2>
        <p className="text-sm">
          {decidedCount} of {tasks.length} task{tasks.length === 1 ? '' : 's'} decided
        </p>
        <nav aria-label="Jump to task" className="flex flex-wrap gap-1">
          {progress.map(({ task, counts, decided }) => (
            <button
              key={task.id}
              type="button"
              className={`rounded border px-2 py-0.5 text-xs ${
                decided
                  ? 'border-green-500/50 text-green-700 dark:text-green-400'
                  : 'border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10'
              }`}
              title={`Jump to ${task.name}`}
              onClick={() =>
                document
                  .getElementById(sectionId(task.id))
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {task.name}
              {decided ? (
                <>
                  <span aria-hidden="true"> ✓</span>
                  <span className="sr-only"> decided</span>
                </>
              ) : counts ? (
                <>
                  <span aria-hidden="true"> · {counts.undecided}?</span>
                  <span className="sr-only"> {counts.undecided} undecided</span>
                </>
              ) : null}
            </button>
          ))}
        </nav>
        <p className="text-xs opacity-50">Select a task in the sidebar to return to single-task view.</p>
      </div>

      {tasks.map((task) => {
        const generating = generatingTaskIds.includes(task.id);
        const shown = visibleIteration(task, currentRound) ?? null;
        const shownRound =
          shown?.images.map((img) => roundNumberFromImageUrl(img.url)).find((n): n is number => n !== null) ??
          currentRound ??
          null;
        return (
          <div key={task.id} id={sectionId(task.id)} className="flex scroll-mt-6 flex-col gap-2">
            <label className="text-xs font-medium uppercase tracking-wide opacity-60">
              {task.name}
              {generating
                ? ' · generating…'
                : shown
                  ? shownRound != null
                    ? ` · round r${shownRound}`
                    : ` · round ${shown.index + 1}`
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
            ) : shown ? (
              <ReviewGrid
                iteration={shown}
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
