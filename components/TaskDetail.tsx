'use client';

/**
 * blastimage — active-task detail pane (BI-003)
 *
 * Editable task name + base-prompt editor (persisted on blur), the reference
 * library (BI-004), the generate controls (BI-007), and the batch review grid
 * (BI-005): the latest iteration renders as keep/discard/approve cards with
 * star ratings and a feedback button (the feedback modal lands in BI-006).
 */

import { useEffect, useState } from 'react';

import type { ID, PromptTask, RefImage, ReviewDecision, StarRating } from '@/lib/types';
import { DEFAULT_BATCH_SIZE } from '@/lib/useWorkspace';
import ReferenceLibrary from '@/components/ReferenceLibrary';
import ReviewGrid from '@/components/ReviewGrid';

interface TaskDetailProps {
  task: PromptTask | null;
  library: RefImage[];
  /** True while this task's batch is generating (disables the button, shows skeletons). */
  generating: boolean;
  /**
   * True when the Grok Imagine bridge is installed (BI-031.2). False in a plain
   * browser / adopter mode, where generation runs in the terminal loop instead —
   * the button is disabled and says so rather than failing on click.
   */
  generationAvailable: boolean;
  /** Returns whether the rename was applied — `false` when the user declined the slug-break warning (BI-030.3). */
  onRenameTask: (id: ID, name: string) => boolean;
  onSetPrompt: (id: ID, basePrompt: string) => void;
  onAddRefImage: (ref: RefImage) => void;
  onRemoveRefImage: (refId: ID) => void;
  onToggleRef: (taskId: ID, refId: ID) => void;
  onGenerate: (taskId: ID, opts?: { prompt?: string; primaryRefImageId?: ID }) => void;
  onSetImageDecision: (taskId: ID, imageId: ID, decision: ReviewDecision) => void;
  onSetImageRating: (taskId: ID, imageId: ID, rating: StarRating) => void;
  onFeedback: (taskId: ID, imageId: ID) => void;
  onIterate: (taskId: ID, imageId: ID) => void;
}

export default function TaskDetail({
  task,
  library,
  generating,
  generationAvailable,
  onRenameTask,
  onSetPrompt,
  onAddRefImage,
  onRemoveRefImage,
  onToggleRef,
  onGenerate,
  onSetImageDecision,
  onSetImageRating,
  onFeedback,
  onIterate,
}: TaskDetailProps) {
  // Controlled prompt draft so a just-typed (unblurred) prompt is never lost at
  // generate time (fixes BI-007's known gap). Resyncs only on task switch, so an
  // in-progress edit survives external session updates (e.g. a finished round).
  const [promptDraft, setPromptDraft] = useState(task?.basePrompt ?? '');
  useEffect(() => {
    setPromptDraft(task?.basePrompt ?? '');
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) {
    return (
      <section className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm opacity-50">Select a task, or add one from the sidebar.</p>
      </section>
    );
  }

  // References are optional — a round needs a prompt or at least one reference.
  const hasSignal = !!promptDraft.trim() || task.activeRefImageIds.length > 0;
  // Why Generate is unavailable, or `null` when it can fire. The missing-bridge
  // reason outranks the missing-signal one: no prompt will help a browser that
  // cannot generate at all (BI-031.2).
  const generateHint = !generationAvailable
    ? {
        note: 'In-app generation is Grok-Build-only — generate rounds from the terminal loop.',
        title:
          'The Grok Imagine provider bridge is not installed in this browser. Generate rounds from the terminal loop (see docs/REVIEW-LOOP.md); this view keeps working for review and selection.',
      }
    : !hasSignal
      ? {
          note: 'Add a prompt or a reference to generate.',
          title: 'Add a prompt or a reference first',
        }
      : null;
  const canGenerate = generateHint === null;
  const latest = task.iterations.at(-1) ?? null;

  // Persist the live draft and generate from it, so the round always uses what's
  // on screen rather than the last-blurred value.
  const handleGenerate = () => {
    if (promptDraft !== task.basePrompt) onSetPrompt(task.id, promptDraft);
    onGenerate(task.id, { prompt: promptDraft });
  };

  return (
    <section className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      {/* Editable task name */}
      <input
        key={task.id}
        defaultValue={task.name}
        aria-label="Task name"
        className="w-full border-b border-transparent bg-transparent text-xl font-semibold focus:border-black/20 focus:outline-none dark:focus:border-white/20"
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (!v || v === task.name) return;
          // The field is uncontrolled, so a declined rename would leave it
          // showing a name the session never took — put it back (BI-030.3).
          if (!onRenameTask(task.id, v)) e.target.value = task.name;
        }}
      />

      {/* Prompt editor */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-60">Prompt</label>
        <textarea
          value={promptDraft}
          onChange={(e) => setPromptDraft(e.target.value)}
          rows={5}
          placeholder="Describe the image you want to generate…"
          className="w-full resize-y rounded border border-black/15 bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/40 dark:border-white/15"
          onBlur={(e) => onSetPrompt(task.id, e.target.value)}
        />
      </div>

      {/* Reference library (BI-004) */}
      <ReferenceLibrary
        task={task}
        library={library}
        onAddRefImage={onAddRefImage}
        onRemoveRefImage={onRemoveRefImage}
        onToggleRef={onToggleRef}
      />

      {/* Generate controls (BI-007) */}
      <div className="flex items-center gap-3">
        <button
          disabled={generating || !canGenerate}
          onClick={handleGenerate}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          title={generateHint?.title ?? 'Generate a batch'}
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
        {generateHint && <span className="text-xs opacity-50">{generateHint.note}</span>}
      </div>

      {/* Latest batch — the review grid (BI-005) */}
      {(generating || latest) && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium uppercase tracking-wide opacity-60">
            {generating ? 'Generating…' : `Latest batch · round ${(latest?.index ?? 0) + 1}`}
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
          ) : (
            latest && (
              <ReviewGrid
                iteration={latest}
                onSetDecision={(imageId, decision) => onSetImageDecision(task.id, imageId, decision)}
                onSetRating={(imageId, rating) => onSetImageRating(task.id, imageId, rating)}
                onFeedback={(imageId) => onFeedback(task.id, imageId)}
                onIterate={(imageId) => onIterate(task.id, imageId)}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}
