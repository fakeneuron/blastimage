'use client';

/**
 * blastimage — linked imagegen folder context (BI-024.1 · server adapter BI-045 · picker BI-046)
 *
 * Restores the linked `imagegen/` root on mount, turns `imagegen:` path URLs
 * into servable `/api/imagegen/file` URLs, and exposes the read/write API the
 * workspace hook uses to load round batches and record decisions.
 *
 * BI-045 moved the filesystem work from the browser to the app's own localhost
 * routes. The File System Access API this originally used is Chromium-only, so
 * Safari and Brave could not link a folder at all. The public {@link ImagegenApi}
 * is unchanged across that swap — `useWorkspace` and `ResolvedImage` never knew
 * which side of the wire the bytes came from.
 *
 * Two members are now vestigial by design rather than removed:
 * `retainDisplayUrl` has nothing to pin (a route URL is not an object URL the
 * provider must keep alive), and `blobEpoch` survives as the cache-buster
 * appended to a reloaded round's image URLs — the same staleness signal
 * BI-042.2 introduced, spent on HTTP caching instead of `URL.revokeObjectURL`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  approvedConflict as approvedConflictRequest,
  browseDirectory,
  imagegenFileUrl,
  linkImagegenRoot,
  listRounds as listRoundsRequest,
  promoteApproved as promoteApprovedRequest,
  readRoundBatch,
  removeApproved as removeApprovedRequest,
  restoreLinkedRoot,
  suggestedRoots,
  writeRoundSelection as writeRoundSelectionRequest,
} from './imagegenClient';
import { resolveImageBlob, type ImageBlobResolver } from './imageBlob';
import type { DirectoryListing } from './imagegenServerFs';
import { imagegenPathFromUrl, isImagegenUrl } from './imagegenUrl';
import type { RoundBatch } from './roundBatch';
import type { RoundSelectionTask } from './roundSelection';
import type { Result } from './storage';

/** The message every operation returns before a folder has been linked. */
const UNLINKED = 'Link your imagegen folder first (🔗 in the sidebar).';

/** Imagegen surface consumed by {@link useWorkspace} for round ingest + selection writes. */
export interface ImagegenApi {
  linked: boolean;
  /** Validates and stores the folder the picker returned; yields its canonical path. */
  linkFolder: (path: string) => Promise<Result<string>>;
  /** Subdirectories of `path` for the picker's tree; absent `path` starts at home (BI-046). */
  browse: (path?: string) => Promise<Result<DirectoryListing>>;
  /** Absolute paths worth offering as the picker's shortcuts (BI-046). */
  suggestRoots: () => Promise<string[]>;
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
   * Bumped whenever a round is (re)loaded, so images already on screen re-resolve
   * onto the bytes now on disk instead of a cached copy (BI-042.2). Consumers
   * list it in their resolve effect's deps; since BI-045 it also rides along as
   * the `v=` parameter that defeats the browser's own HTTP cache.
   */
  blobEpoch: number;
  /**
   * Marks `blobUrl` as on screen. Retained for the consumer contract BI-042.2
   * established; with images served over HTTP there is no object URL whose
   * lifetime the provider owns, so this is a no-op returning a no-op release.
   */
  retainDisplayUrl: (blobUrl: string) => () => void;
  /** The sole URL→bytes path (BI-029.2) — see {@link import('./imageBlob').resolveImageBlob}. */
  resolveBlob: ImageBlobResolver;
}

const ImagegenContext = createContext<ImagegenApi | null>(null);

const NO_RELEASE = (): void => {};

export function ImagegenProvider({ children }: { children: ReactNode }) {
  const rootRef = useRef<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [blobEpoch, setBlobEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const root = await restoreLinkedRoot();
      if (cancelled) return;
      rootRef.current = root;
      setLinked(!!root);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const linkFolder = useCallback(async (path: string): Promise<Result<string>> => {
    const result = await linkImagegenRoot(path);
    if (result.ok) {
      rootRef.current = result.value;
      setLinked(true);
    }
    return result;
  }, []);

  const browse = useCallback(
    async (path?: string): Promise<Result<DirectoryListing>> => browseDirectory(path),
    [],
  );

  const suggestRoots = useCallback(async (): Promise<string[]> => suggestedRoots(), []);

  const listRounds = useCallback(async (): Promise<number[]> => {
    const root = rootRef.current;
    if (!root) return [];
    return listRoundsRequest(root);
  }, []);

  const readRound = useCallback(async (round: number): Promise<Result<RoundBatch>> => {
    const root = rootRef.current;
    if (!root) return { ok: false, error: UNLINKED };
    // Wake displaying consumers onto the bytes now on disk — a round rerun in
    // the terminal rewrites `rounds/r<N>/` under the URLs they are showing.
    setBlobEpoch((e) => e + 1);
    return readRoundBatch(root, round);
  }, []);

  const writeSelection = useCallback(
    async (
      round: number,
      tasks: RoundSelectionTask[],
      selectedAt: string,
    ): Promise<Result<void>> => {
      const root = rootRef.current;
      if (!root) return { ok: false, error: UNLINKED };
      return writeRoundSelectionRequest(root, round, tasks, selectedAt);
    },
    [],
  );

  const promoteApproved = useCallback(
    async (round: number, keeperFilename: string): Promise<Result<void>> => {
      const root = rootRef.current;
      if (!root) return { ok: false, error: UNLINKED };
      return promoteApprovedRequest(root, round, keeperFilename);
    },
    [],
  );

  const unpromoteApproved = useCallback(
    async (keeperFilename: string): Promise<Result<void>> => {
      const root = rootRef.current;
      if (!root) return { ok: false, error: UNLINKED };
      return removeApprovedRequest(root, keeperFilename);
    },
    [],
  );

  const approvedConflict = useCallback(
    async (round: number, keeperFilename: string): Promise<Result<boolean>> => {
      const root = rootRef.current;
      if (!root) return { ok: false, error: UNLINKED };
      return approvedConflictRequest(root, round, keeperFilename);
    },
    [],
  );

  const resolveDisplayUrl = useCallback(
    async (url: string): Promise<string> => {
      if (!isImagegenUrl(url)) return url;
      const root = rootRef.current;
      if (!root) return url;
      return imagegenFileUrl(root, imagegenPathFromUrl(url), blobEpoch);
    },
    [blobEpoch],
  );

  const retainDisplayUrl = useCallback((): (() => void) => NO_RELEASE, []);

  const resolveBlob = useCallback(
    async (url: string): Promise<Blob> => resolveImageBlob(url, rootRef.current),
    [],
  );

  // Stable identity except when linked/blobEpoch (or a callback) change —
  // without this, every provider re-render mints a new object and re-fires
  // useWorkspace's [imagegen, imagegen.linked] listRounds() effect (BI-042.4).
  const value = useMemo<ImagegenApi>(
    () => ({
      linked,
      linkFolder,
      browse,
      suggestRoots,
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
    }),
    [
      linked,
      linkFolder,
      browse,
      suggestRoots,
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
    ],
  );

  return <ImagegenContext.Provider value={value}>{children}</ImagegenContext.Provider>;
}

/** Returns the imagegen API; must run under {@link ImagegenProvider}. */
export function useImagegen(): ImagegenApi {
  const ctx = useContext(ImagegenContext);
  if (!ctx) {
    throw new Error('useImagegen must be used within ImagegenProvider');
  }
  return ctx;
}
