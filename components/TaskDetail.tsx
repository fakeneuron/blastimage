'use client';

/**
 * blastimage — active-task detail pane (BI-003)
 *
 * Editable task name + base-prompt editor (persisted on blur), the reference
 * library (BI-004), and the generate controls (BI-007): a Generate button that
 * triggers a round plus a temporary strip of the latest batch. The polished
 * review grid (keep/discard/rating) lands in BI-005.
 */

import type { ID, PromptTask, RefImage } from '@/lib/types';
import ReferenceLibrary from '@/components/ReferenceLibrary';

interface TaskDetailProps {
  task: PromptTask | null;
  library: RefImage[];
  /** True while this task's batch is generating (disables the button, shows skeletons). */
  generating: boolean;
  onRenameTask: (id: ID, name: string) => void;
  onSetPrompt: (id: ID, basePrompt: string) => void;
  onAddRefImage: (ref: RefImage) => void;
  onRemoveRefImage: (refId: ID) => void;
  onToggleRef: (taskId: ID, refId: ID) => void;
  onGenerate: (taskId: ID) => void;
}

export default function TaskDetail({
  task,
  library,
  generating,
  onRenameTask,
  onSetPrompt,
  onAddRefImage,
  onRemoveRefImage,
  onToggleRef,
  onGenerate,
}: TaskDetailProps) {
  if (!task) {
    return (
      <section className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm opacity-50">Select a task, or add one from the sidebar.</p>
      </section>
    );
  }

  // References are optional — a round needs a prompt or at least one reference.
  const canGenerate = !!task.basePrompt.trim() || task.activeRefImageIds.length > 0;
  const latest = task.iterations.at(-1) ?? null;

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
          if (v && v !== task.name) onRenameTask(task.id, v);
        }}
      />

      {/* Prompt editor */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-60">Prompt</label>
        <textarea
          key={`prompt-${task.id}`}
          defaultValue={task.basePrompt}
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
          onClick={() => onGenerate(task.id)}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          title={canGenerate ? 'Generate a batch' : 'Add a prompt or a reference first'}
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
        {!canGenerate && (
          <span className="text-xs opacity-50">Add a prompt or a reference to generate.</span>
        )}
      </div>

      {/* Latest batch — temporary strip; the review grid lands in BI-005 */}
      {(generating || latest) && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium uppercase tracking-wide opacity-60">
            {generating ? 'Generating…' : `Latest batch · round ${(latest?.index ?? 0) + 1}`}
          </label>
          <div className="flex flex-wrap gap-3">
            {generating
              ? Array.from({ length: 4 }, (_, i) => (
                  <div
                    key={i}
                    className="h-28 w-40 animate-pulse rounded border border-black/10 bg-foreground/10 dark:border-white/10"
                  />
                ))
              : latest?.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.prompt || 'generated image'}
                    className="h-28 w-40 rounded border border-black/10 object-cover dark:border-white/10"
                  />
                ))}
          </div>
        </div>
      )}
    </section>
  );
}
