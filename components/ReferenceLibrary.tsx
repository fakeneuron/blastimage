'use client';

/**
 * blastimage — reference library UI (BI-004)
 *
 * Fills the BI-003 placeholder in {@link TaskDetail}: drag-and-drop (and click)
 * upload into the session's global library, a thumbnail grid, and per-task
 * active selection capped at {@link MAX_ACTIVE_REFS}. DOM concerns (drag events,
 * `FileReader`, `Image()` decode, size/type validation) live here; the pure
 * `Session` mutations + persistence live in `lib/workspace.ts` / `useWorkspace`.
 */

import { useRef, useState } from 'react';

import type { ID, PromptTask, RefImage } from '@/lib/types';
import { MAX_ACTIVE_REFS, newRefImage } from '@/lib/workspace';

/** Soft per-file cap — base64 refs live inline in localStorage, so guard the quota. */
const MAX_REF_BYTES = 2 * 1024 * 1024;

interface ReferenceLibraryProps {
  task: PromptTask;
  library: RefImage[];
  onAddRefImage: (ref: RefImage) => void;
  onRemoveRefImage: (refId: ID) => void;
  onToggleRef: (taskId: ID, refId: ID) => void;
}

/** Reads a File into a data URL. */
function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/** Decodes a data URL's intrinsic dimensions; resolves `undefined`s if it can't. */
function readDimensions(dataUrl: string): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = dataUrl;
  });
}

export default function ReferenceLibrary({
  task,
  library,
  onAddRefImage,
  onRemoveRefImage,
  onToggleRef,
}: ReferenceLibraryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const selectedCount = task.activeRefImageIds.length;
  const atCap = selectedCount >= MAX_ACTIVE_REFS;

  async function ingest(files: FileList | File[]) {
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        rejected.push(`${file.name} (not an image)`);
        continue;
      }
      if (file.size > MAX_REF_BYTES) {
        rejected.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB > 2MB)`);
        continue;
      }
      const dataUrl = await readDataUrl(file);
      const { width, height } = await readDimensions(dataUrl);
      onAddRefImage(newRefImage(file.name, dataUrl, file.type, width, height));
    }
    setWarning(rejected.length ? `Skipped: ${rejected.join(', ')}` : null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="ref-library-upload"
          className="text-xs font-medium uppercase tracking-wide opacity-60"
        >
          References
        </label>
        <span className="text-xs opacity-50">
          {selectedCount}/{MAX_ACTIVE_REFS} active
        </span>
      </div>

      {/* Dropzone (click opens the file picker) */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-20 w-full items-center justify-center rounded border border-dashed p-4 text-sm transition-colors ${
          dragging
            ? 'border-foreground/60 bg-foreground/5'
            : 'border-black/20 opacity-70 hover:opacity-100 dark:border-white/20'
        }`}
      >
        Drag &amp; drop images here, or click to upload
      </button>
      <input
        id="ref-library-upload"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void ingest(e.target.files);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />

      {warning && <p className="text-xs text-amber-600 dark:text-amber-500">{warning}</p>}

      {/* Thumbnail grid */}
      {library.length === 0 ? (
        <p className="py-2 text-xs opacity-50">No reference images yet.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {library.map((ref) => {
            const selected = task.activeRefImageIds.includes(ref.id);
            const disabled = !selected && atCap;
            return (
              <li key={ref.id} className="group relative">
                <button
                  type="button"
                  disabled={disabled}
                  title={disabled ? `Deselect one — max ${MAX_ACTIVE_REFS}` : ref.name}
                  onClick={() => onToggleRef(task.id, ref.id)}
                  className={`block aspect-square w-full overflow-hidden rounded border-2 transition ${
                    selected
                      ? 'border-foreground ring-2 ring-foreground/40'
                      : 'border-transparent hover:border-black/30 dark:hover:border-white/30'
                  } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref.dataUrl} alt={ref.name} className="h-full w-full object-cover" />
                </button>
                {selected && (
                  <span className="pointer-events-none absolute left-1 top-1 rounded bg-foreground px-1 text-[10px] font-semibold text-background">
                    ✓
                  </span>
                )}
                <button
                  type="button"
                  title="Remove from library"
                  onClick={() => onRemoveRefImage(ref.id)}
                  className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
