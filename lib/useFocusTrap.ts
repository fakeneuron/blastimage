'use client';

/**
 * blastimage — focus trap for aria-modal dialogs (BI-039)
 *
 * Generalises the BI-035.5 Lightbox contract so every dialog that claims
 * `aria-modal="true"` can back it: open moves focus into the dialog, Tab /
 * Shift+Tab cycle its own enabled focusables (fully managed — the handler
 * picks the next target and preventDefaults, so boundaries are deterministic
 * in happy-dom and the browser), Escape dismisses, and unmount restores focus
 * to whatever held it when the dialog mounted.
 *
 * Consumers must put `ref` + `tabIndex={-1}` on the element carrying
 * `role="dialog"`, and unmount on close so the restore rides effect cleanup.
 */

import { type RefObject, useEffect } from 'react';

/**
 * Everything inside the dialog that can hold focus. Disabled controls and
 * explicit `tabIndex={-1}` opt out (e.g. ImportBuilder's hidden file input,
 * which is activated via a labeled button rather than the tab cycle).
 */
export const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
export type FocusTarget = 'dialog' | 'first';

export interface UseFocusTrapOptions {
  /** Called when Escape is pressed while the trap is active. */
  onEscape: () => void;
  /**
   * Where to put focus on open. `'dialog'` focuses the dialog container
   * (Lightbox: screen readers announce the dialog name). `'first'` focuses
   * the first enabled focusable, falling back to the dialog (form modals).
   * Default: `'first'`.
   */
  focusTarget?: FocusTarget;
}

/**
 * Mount-scoped focus trap. `onEscape` is re-read each keydown so callers can
 * pass a stable or unstable close callback without re-binding the listener.
 */
export function useFocusTrap(
  dialogRef: RefObject<HTMLElement | null>,
  { onEscape, focusTarget = 'first' }: UseFocusTrapOptions,
): void {
  // Open: capture the opener, move focus in. Close: restore the opener.
  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    if (dialog) {
      if (focusTarget === 'first') {
        const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? dialog).focus();
      } else {
        dialog.focus();
      }
    }
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
    // Mount-only: dialogRef is stable; focusTarget is a constant per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc dismisses; Tab is trapped inside the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      const targets = Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (targets.length === 0) return;

      // `at` is -1 while focus sits on the dialog itself, so a first Tab enters
      // at either end of the set depending on direction.
      const at = targets.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? at <= 0
          ? targets.length - 1
          : at - 1
        : at === -1 || at === targets.length - 1
          ? 0
          : at + 1;
      e.preventDefault();
      targets[next]?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogRef, onEscape]);
}
