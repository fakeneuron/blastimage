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
  listAvailableRounds,
  pickAndLinkImagegenFolder,
  promoteKeeperToApproved,
  readImagegenFile,
  readRoundBatch,
  restoreLinkedImagegenFolder,
  writeRoundSelection,
  type LinkImagegenResult,
} from './imagegenFs';
import { resolveImageBlob, type ImageBlobResolver } from './imageBlob';
import { imagegenPathFromUrl, isImagegenUrl } from './imagegenUrl';
import type { RoundBatch } from './roundBatch';
import type { RoundSelectionTask } from './roundSelection';
import type { Result } from './storage';

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
  resolveDisplayUrl: (url: string) => Promise<string>;
  /** The sole URL→bytes path (BI-029.2) — see {@link import('./imageBlob').resolveImageBlob}. */
  resolveBlob: ImageBlobResolver;
}

const ImagegenContext = createContext<ImagegenApi | null>(null);

export function ImagegenProvider({ children }: { children: ReactNode }) {
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const blobCacheRef = useRef<Map<string, string>>(new Map());
  const [linked, setLinked] = useState(false);

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

  const resolveDisplayUrl = useCallback(async (url: string): Promise<string> => {
    if (!isImagegenUrl(url)) return url;
    const cached = blobCacheRef.current.get(url);
    if (cached) return cached;
    const root = handleRef.current;
    if (!root) return url;
    try {
      const file = await readImagegenFile(root, imagegenPathFromUrl(url));
      const blobUrl = URL.createObjectURL(file);
      blobCacheRef.current.set(url, blobUrl);
      return blobUrl;
    } catch {
      return url;
    }
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
    resolveDisplayUrl,
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