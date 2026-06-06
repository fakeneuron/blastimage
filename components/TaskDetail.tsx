'use client';

/**
 * blastimage — active-task detail pane (BI-003)
 *
 * Editable task name + base-prompt editor (persisted on blur), plus static
 * placeholder regions for the reference selector (BI-004) and generate controls
 * (BI-007), which later tasks fill in.
 */

import type { ID, PromptTask } from '@/lib/types';

interface TaskDetailProps {
  task: PromptTask | null;
  onRenameTask: (id: ID, name: string) => void;
  onSetPrompt: (id: ID, basePrompt: string) => void;
}

export default function TaskDetail({ task, onRenameTask, onSetPrompt }: TaskDetailProps) {
  if (!task) {
    return (
      <section className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm opacity-50">Select a task, or add one from the sidebar.</p>
      </section>
    );
  }

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

      {/* Reference selector — filled in by BI-004 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium uppercase tracking-wide opacity-60">References</label>
        <div className="flex min-h-24 items-center justify-center rounded border border-dashed border-black/20 p-4 text-sm opacity-50 dark:border-white/20">
          Reference selector — coming in BI-004
        </div>
      </div>

      {/* Generate controls — wired up by BI-007 */}
      <div className="flex items-center gap-3">
        <button
          disabled
          className="cursor-not-allowed rounded bg-foreground px-4 py-2 text-sm font-medium text-background opacity-40"
          title="Generation lands in BI-007"
        >
          Generate
        </button>
        <span className="text-xs opacity-50">Generation lands in BI-007</span>
      </div>
    </section>
  );
}
