'use client';

/**
 * blastimage — approved gallery panel (BI-008)
 *
 * Right-side panel that auto-collects approved images across all tasks.
 * Per-item: thumbnail, task name, star rating, and a Download button.
 * Top: "Export all" downloads the JSON provenance manifest.
 */

import ResolvedImage from '@/components/ResolvedImage';
import type { ApprovedImage, StarRating } from '@/lib/types';
import { downloadBlob, imageExtension, slugify } from '@/lib/storage';

interface GalleryPanelProps {
  approved: ApprovedImage[];
  onExportAll: () => void;
  onExportToFolder: () => void;
  onExportReviewSheet: () => void;
}

function StarDisplay({ rating }: { rating: StarRating }) {
  if (rating === 0) return null;
  return (
    <span className="text-xs opacity-60" aria-label={`${rating} stars`}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

async function downloadImage(url: string, basename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    downloadBlob(blob, `${basename}.${imageExtension(blob.type)}`);
  } catch {
    // Fallback: open in a new tab if the fetch fails (e.g. strict CORS)
    window.open(url, '_blank');
  }
}

export default function GalleryPanel({
  approved,
  onExportAll,
  onExportToFolder,
  onExportReviewSheet,
}: GalleryPanelProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-black/10 bg-black/[.02] dark:border-white/10 dark:bg-white/[.02]">
      <div className="flex items-center justify-between border-b border-black/10 px-3 py-2.5 dark:border-white/10">
        <span className="text-xs font-medium uppercase tracking-wide opacity-60">
          Gallery
          {approved.length > 0 && (
            <span className="ml-1.5 rounded-full bg-foreground px-1.5 py-0.5 text-background">
              {approved.length}
            </span>
          )}
        </span>
        {approved.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              onClick={onExportToFolder}
              title="Write approved images + manifest.json into a folder (downloads individually on browsers without folder access)"
            >
              Folder
            </button>
            <button
              className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              onClick={onExportReviewSheet}
              title="Download a self-contained review.html (thumbnails + prompt/rating/provenance) for a house-style/consistency pass"
            >
              Sheet
            </button>
            <button
              className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              onClick={onExportAll}
              title="Download JSON provenance manifest only"
            >
              JSON
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {approved.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs opacity-40">
            Approved images appear here.
            <br />
            Mark an image as Approved in any task.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {approved.map((item) => (
              <li key={item.imageId} className="flex flex-col gap-1">
                <ResolvedImage
                  src={item.url}
                  alt={item.finalPrompt}
                  className="w-full rounded object-cover"
                  style={{ aspectRatio: '3/2' }}
                />
                <div className="flex items-start justify-between gap-1 px-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{item.taskName}</p>
                    <StarDisplay rating={item.rating} />
                  </div>
                  <button
                    className="shrink-0 rounded border border-black/15 px-1.5 py-0.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                    onClick={() =>
                      downloadImage(
                        item.url,
                        `${slugify(item.taskName) || 'image'}-${item.imageId.slice(0, 8)}`,
                      )
                    }
                    title="Download image"
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
