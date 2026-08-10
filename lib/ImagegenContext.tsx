'use client';

/**
 * blastimage — linked imagegen folder context (BI-024.1)
 *
 * Restores the persisted `imagegen/` directory handle on mount, resolves
 * `imagegen:` path URLs to blob URLs for display, and exposes the FSA read API
 * the workspace hook uses to load round batches.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  approvedFileConflict,
  listAvailableRounds,
  pickAndLinkImagegenFolder,
  promoteKeeperToApproved,
  readImagegenFile,
  readRoundBatch,
  removeApprovedFile,
  restoreLinkedImagegenFolder,
  writeRoundSelection,
  type LinkImagegenResult,
} from './imagegenFs';
import { resolveImageBlob, type ImageBlobResolver } from './imageBlob';
import { imagegenPathFromUrl, isImagegenUrl, roundNumberFromImageUrl } from './imagegenUrl';
import type { RoundBatch } from './roundBatch';
import type { RoundSelectionTask } from './roundSelection';
import type { Result } from './storage';

/**
 * Eviction threshold for `resolveDisplayUrl`'s blob-URL cache (BI-029.4) —
 * without one it grows for the life of the single `ImagegenProvider` mount,
 * since object URLs are otherwise only revoked on unmount. Sized to comfortably
 * hold a few fully-loaded rounds of review images without visible re-fetch churn.
 *
 * A *soft* bound since BI-042.2: entries a mounted consumer is displaying are
 * never evicted, so the cache may sit above this while more than that many
 * images are on screen at once. It settles back as they unmount.
 */
const BLOB_CACHE_MAX_ENTRIES = 200;

/**
 * Evicts the least-recently-used *evictable* entry (oldest first by `Map`
 * insertion order) and revokes its object URL.
 *
 * `displayed` holds the blob URLs a mounted consumer is currently rendering
 * (BI-042.2). Those are skipped: revoking one strands a live `<img>` on a dead
 * URL, and the bound exists to cap memory, not to break what is on screen. When
 * every entry is held the bound goes soft and nothing is evicted — self-limiting,
 * since an entry becomes evictable the moment its consumer unmounts.
 *
 * Deliberately silent: unlike {@link invalidateRoundBlobs}, an eviction must NOT
 * signal consumers. Waking them would make the evicted image re-read and re-insert,
 * evicting the next held entry in turn — an unbounded loop whenever more images
 * are mounted than the cache can hold.
 */
function evictOldestBlob(cache: Map<string, string>, displayed: ReadonlyMap<string, number>): void {
  for (const [url, blobUrl] of cache) {
    if (displayed.has(blobUrl)) continue;
    URL.revokeObjectURL(blobUrl);
    cache.delete(url);
    return;
  }
}

/**
 * Drops and revokes every cached entry belonging to `round` — called before a
 * (re)load so a round rewritten on disk (e.g. a rerun of `/blast-generate`
 * against an existing `rounds/r<N>/`) never serves a stale cached blob. Returns
 * how many entries were revoked, so the caller only wakes consumers when a
 * revocation actually happened (BI-042.2).
 *
 * Revokes unconditionally, including entries a consumer is displaying: staleness
 * outranks the cached bytes, and the `blobEpoch` bump this feeds makes those
 * consumers re-resolve onto the new file rather than strand.
 */
function invalidateRoundBlobs(cache: Map<string, string>, round: number): number {
  let revoked = 0;
  for (const [url, blobUrl] of cache) {
    if (roundNumberFromImageUrl(url) === round) {
      URL.revokeObjectURL(blobUrl);
      cache.delete(url);
      revoked += 1;
    }
  }
  return revoked;
}

/** Adds one hold on `blobUrl`; the same blob URL can be rendered by several consumers at once. */
function retainBlobUrl(displayed: Map<string, number>, blobUrl: string): void {
  displayed.set(blobUrl, (displayed.get(blobUrl) ?? 0) + 1);
}

/** Drops one hold on `blobUrl`, forgetting it only once the last consumer releases. */
function releaseBlobUrl(displayed: Map<string, number>, blobUrl: string): void {
  const holds = displayed.get(blobUrl);
  if (holds === undefined) return;
  if (holds <= 1) displayed.delete(blobUrl);
  else displayed.set(blobUrl, holds - 1);
}

/** FSA surface consumed by {@link useWorkspace} for round ingest + selection writes. */
export interface ImagegenApi {
  linked: boolean;
  linkFolder: () => Promise<LinkImagegenResult>;
  listRounds: () => Promise<number[]>;
  readRound: (round: number) => Promise<Result<RoundBatch>>;
  writeSelection: (
    round: number,
    tasks: RoundSelectionTask[],
    selectedAt: string,
  ) => Promise<Result<void>>;
  promoteApproved: (round: number, keeperFilename: string) => Promise<Result<void>>;
  /** Inverse of {@link ImagegenApi.promoteApproved} — clears a mis-clicked approve (BI-030.2). */
  unpromoteApproved: (keeperFilename: string) => Promise<Result<void>>;
  /** True when {@link ImagegenApi.promoteApproved} would replace a different image (BI-032). */
  approvedConflict: (round: number, keeperFilename: string) => Promise<Result<boolean>>;
  resolveDisplayUrl: (url: string) => Promise<string>;
  /**
   * Bumped whenever a cached blob URL is revoked for *staleness* (BI-042.2).
   * Consumers list it in their resolve effect's deps so a round reload
   * re-resolves them onto the new bytes instead of leaving them on a dead URL —
   * the same shape BI-038 used with {@link ImagegenApi.linked}. Eviction does
   * not bump it; see {@link evictOldestBlob}.
   */
  blobEpoch: number;
  /**
   * Marks `blobUrl` as on screen so eviction won't revoke it, and returns the
   * matching release — call it from a `useEffect` cleanup so the pair can never
   * drift apart (BI-042.2). Held blob URLs are refcounted: the same image
   * rendered in two places stays held until both unmount.
   */
  retainDisplayUrl: (blobUrl: string) => () => void;
  /** The sole URL→bytes path (BI-029.2) — see {@link import('./imageBlob').resolveImageBlob}. */
  resolveBlob: ImageBlobResolver;
}

const ImagegenContext = createContext<ImagegenApi | null>(null);

export function ImagegenProvider({ children }: { children: ReactNode }) {
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const blobCacheRef = useRef<Map<string, string>>(new Map());
  /** Blob URLs currently rendered by a mounted consumer → hold count (BI-042.2). */
  const displayedRef = useRef<Map<string, number>>(new Map());
  const [linked, setLinked] = useState(false);
  const [blobEpoch, setBlobEpoch] = useState(0);

  useEffect(() => {
    const cache = blobCacheRef.current;
    let cancelled = false;
    void (async () => {
      const handle = await restoreLinkedImagegenFolder();
      if (cancelled) return;
      handleRef.current = handle;
      setLinked(!!handle);
    })();
    return () => {
      cancelled = true;
      for (const blobUrl of cache.values()) {
        URL.revokeObjectURL(blobUrl);
      }
      cache.clear();
    };
  }, []);

  const linkFolder = useCallback(async (): Promise<LinkImagegenResult> => {
    const result = await pickAndLinkImagegenFolder();
    if (result.status === 'linked') {
      handleRef.current = result.handle;
      setLinked(true);
    }
    return result;
  }, []);

  const listRounds = useCallback(async (): Promise<number[]> => {
    const root = handleRef.current;
    if (!root) return [];
    return listAvailableRounds(root);
  }, []);

  const readRound = useCallback(async (round: number): Promise<Result<RoundBatch>> => {
    const root = handleRef.current;
    if (!root) {
      return { ok: false, error: 'Link your imagegen folder first (🔗 in the sidebar).' };
    }
    // Wake displaying consumers only when something was actually revoked —
    // an unconditional bump would re-resolve every mounted image on every load.
    if (invalidateRoundBlobs(blobCacheRef.current, round) > 0) setBlobEpoch((e) => e + 1);
    return readRoundBatch(root, round);
  }, []);

  const writeSelection = useCallback(
    async (
      round: number,
      tasks: RoundSelectionTask[],
      selectedAt: string,
    ): Promise<Result<void>> => {
      const root = handleRef.current;
      if (!root) {
        return { ok: false, error: 'Link your imagegen folder first (🔗 in the sidebar).' };
      }
      return writeRoundSelection(root, round, tasks, selectedAt);
    },
    [],
  );

  const promoteApproved = useCallback(
    async (round: number, keeperFilename: string): Promise<Result<void>> => {
      const root = handleRef.current;
      if (!root) {
        return { ok: false, error: 'Link your imagegen folder first (🔗 in the sidebar).' };
      }
      return promoteKeeperToApproved(root, round, keeperFilename);
    },
    [],
  );

  const unpromoteApproved = useCallback(
    async (keeperFilename: string): Promise<Result<void>> => {
      const root = handleRef.current;
      if (!root) {
        return { ok: false, error: 'Link your imagegen folder first (🔗 in the sidebar).' };
      }
      return removeApprovedFile(root, keeperFilename);
    },
    [],
  );

  const approvedConflict = useCallback(
    async (round: number, keeperFilename: string): Promise<Result<boolean>> => {
      const root = handleRef.current;
      if (!root) {
        return { ok: false, error: 'Link your imagegen folder first (🔗 in the sidebar).' };
      }
      return approvedFileConflict(root, round, keeperFilename);
    },
    [],
  );

  const resolveDisplayUrl = useCallback(async (url: string): Promise<string> => {
    if (!isImagegenUrl(url)) return url;
    const cache = blobCacheRef.current;
    const cached = cache.get(url);
    if (cached) {
      // Bump recency: delete + re-set moves the key to the end of Map's
      // insertion-order iteration, which evictOldestBlob relies on.
      cache.delete(url);
      cache.set(url, cached);
      return cached;
    }
    const root = handleRef.current;
    if (!root) return url;
    try {
      const file = await readImagegenFile(root, imagegenPathFromUrl(url));
      const blobUrl = URL.createObjectURL(file);
      if (cache.size >= BLOB_CACHE_MAX_ENTRIES) evictOldestBlob(cache, displayedRef.current);
      cache.set(url, blobUrl);
      return blobUrl;
    } catch {
      return url;
    }
  }, []);

  const retainDisplayUrl = useCallback((blobUrl: string): (() => void) => {
    const displayed = displayedRef.current;
    retainBlobUrl(displayed, blobUrl);
    return () => releaseBlobUrl(displayed, blobUrl);
  }, []);

  const resolveBlob = useCallback(
    async (url: string): Promise<Blob> => resolveImageBlob(url, handleRef.current),
    [],
  );

  const value: ImagegenApi = {
    linked,
    linkFolder,
    listRounds,
    readRound,
    writeSelection,
    promoteApproved,
    unpromoteApproved,
    approvedConflict,
    resolveDisplayUrl,
    blobEpoch,
    retainDisplayUrl,
    resolveBlob,
  };

  return <ImagegenContext.Provider value={value}>{children}</ImagegenContext.Provider>;
}

/** Returns the imagegen FSA API; must run under {@link ImagegenProvider}. */
export function useImagegen(): ImagegenApi {
  const ctx = useContext(ImagegenContext);
  if (!ctx) {
    throw new Error('useImagegen must be used within ImagegenProvider');
  }
  return ctx;
}