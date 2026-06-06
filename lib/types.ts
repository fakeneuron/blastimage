/**
 * blastimage — core data model (BI-001)
 *
 * Single source of truth for the shapes that flow through the whole app:
 * a {@link Session} (one website project / workspace) holds many
 * {@link PromptTask}s and a global {@link RefImage} library. Each task runs a
 * series of {@link Iteration}s; every iteration produces a batch of
 * {@link GeneratedImage}s, each carrying a review decision, rating, and
 * optional {@link FeedbackState}. Approved images are projected into
 * {@link ApprovedImage}s for the gallery and bundled into an
 * {@link ExportManifest} on export.
 *
 * State is persisted to localStorage (BI-002). This file is type-only except
 * for {@link SCHEMA_VERSION}, which anchors the persisted model version.
 */

/** Bump when the persisted shape changes in a non-backward-compatible way (BI-002 reads this). */
export const SCHEMA_VERSION = 1;

// ─────────────────────────────────────────────────────────────────────────
// Primitives
// ─────────────────────────────────────────────────────────────────────────

/** Opaque unique identifier (uuid / nanoid string). */
export type ID = string;

/** ISO 8601 timestamp string, e.g. "2026-06-06T14:43:00.000Z". */
export type Timestamp = string;

/** Star rating on a review card; `0` means unrated. */
export type StarRating = 0 | 1 | 2 | 3 | 4 | 5;

/** Number of candidate images generated per batch (VISION: 3–5). */
export type BatchSize = 3 | 4 | 5;

/** Lifecycle of a single generated image as it is produced. */
export type GenerationStatus = 'pending' | 'generating' | 'ready' | 'failed';

/**
 * Reviewer's verdict on a generated image.
 * - `undecided` — awaiting review
 * - `discarded` — rejected; excluded from iteration and export
 * - `kept` — retained as a candidate/keeper that can seed the next iteration
 * - `approved` — final; auto-filed into the approved gallery and export manifest
 */
export type ReviewDecision = 'undecided' | 'discarded' | 'kept' | 'approved';

// ─────────────────────────────────────────────────────────────────────────
// Reference library
// ─────────────────────────────────────────────────────────────────────────

/**
 * A reference photo in the session's global library (site shots, brand
 * elements, mood references). Stored inline as a base64 data URL so the whole
 * workspace survives a refresh from localStorage alone.
 */
export interface RefImage {
  id: ID;
  /** Filename or user-supplied label. */
  name: string;
  /** base64 data URL; the actual image bytes live here. */
  dataUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  addedAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────
// Feedback
// ─────────────────────────────────────────────────────────────────────────

/**
 * Targeted feedback attached to a single {@link GeneratedImage} (BI-006).
 * Drives the next iteration's refined prompt; `useAsReference` promotes this
 * image to the iteration's primary reference.
 */
export interface FeedbackState {
  /** Free-text refinement notes for this image. */
  text: string;
  /** Promote this image as the primary reference for the next iteration. */
  useAsReference: boolean;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────
// Generation
// ─────────────────────────────────────────────────────────────────────────

/**
 * One candidate image within an {@link Iteration}'s batch. Carries its own
 * provenance (the exact prompt that produced it) plus review metadata.
 */
export interface GeneratedImage {
  id: ID;
  /** Data URL (mock picsum, BI-007) or remote URL (real Grok Imagine, BI-011). */
  url: string;
  /** The exact prompt that produced this image. */
  prompt: string;
  status: GenerationStatus;
  decision: ReviewDecision;
  rating: StarRating;
  /** `null` until the user writes feedback. */
  feedback: FeedbackState | null;
  createdAt: Timestamp;
}

/**
 * One generation round for a {@link PromptTask}. Iterations chain: keepers and
 * their feedback from round N seed round N+1 (updated prompt + optional primary
 * reference, BI-007).
 */
export interface Iteration {
  id: ID;
  /** 0-based round number within the parent task. */
  index: number;
  /** Prompt used to generate this batch. */
  prompt: string;
  /** Library references active for this iteration (≤ 3). */
  refImageIds: ID[];
  /** A keeper promoted via "use as reference" that seeded this round, if any. */
  primaryRefImageId: ID | null;
  /** The generated batch (typically {@link BatchSize} images). */
  images: GeneratedImage[];
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────
// Tasks & session
// ─────────────────────────────────────────────────────────────────────────

/**
 * One prompt task within a session — an editable base prompt plus its
 * per-task reference selection and the full iteration history.
 */
export interface PromptTask {
  id: ID;
  /** Human-readable task name (used in the gallery and export manifest). */
  name: string;
  /** Editable base prompt; the starting point for the first iteration. */
  basePrompt: string;
  /** Per-task active reference selection from the library (≤ 3, BI-004). */
  activeRefImageIds: ID[];
  iterations: Iteration[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * The root persisted object: one website project / workspace. Holds every
 * task and the global reference library. This is what BI-002 serializes to
 * and restores from localStorage.
 */
export interface Session {
  id: ID;
  /** Website project name. */
  name: string;
  tasks: PromptTask[];
  /** Global reference photo library shared across the session's tasks. */
  refLibrary: RefImage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Persisted-model version; compared against {@link SCHEMA_VERSION} on load. */
  schemaVersion: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Approval & export (BI-008 / BI-009)
// ─────────────────────────────────────────────────────────────────────────

/**
 * A flattened, provenance-rich view of an approved {@link GeneratedImage},
 * auto-collected across tasks for the gallery and export. Derived from session
 * state (images with `decision === 'approved'`), not stored separately.
 */
export interface ApprovedImage {
  imageId: ID;
  taskId: ID;
  /** Task name at approval time. */
  taskName: string;
  url: string;
  /** The prompt that produced the approved image. */
  finalPrompt: string;
  /** Prompts across the iterations that led to this image, oldest → newest. */
  promptHistory: string[];
  /** Library references used in the producing iteration. */
  refImageIds: ID[];
  rating: StarRating;
  feedback: FeedbackState | null;
  approvedAt: Timestamp;
}

/**
 * The JSON manifest exported alongside approved image files (BI-008/BI-009):
 * full provenance — prompts, iteration history, and references used.
 */
export interface ExportManifest {
  schemaVersion: number;
  sessionId: ID;
  sessionName: string;
  exportedAt: Timestamp;
  approved: ApprovedImage[];
  /** Reference images used across the approved set. */
  references: RefImage[];
}
