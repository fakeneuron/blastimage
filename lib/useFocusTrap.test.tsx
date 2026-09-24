/**
 * useFocusTrap direct tests (TEST-005).
 *
 * The hook itself has only ever been exercised incidentally through five
 * consumers' component tests (Lightbox + four modals — BI-039). This suite
 * pins its own contract directly: open/restore, managed Tab cycling, and
 * Escape, without any modal's unrelated business logic in the way.
 *
 * `renderHook` alone can't give the hook a real DOM subtree with focusable
 * children and a working `document.activeElement`, so this suite renders a
 * small `Dialog` harness (owns the `ref` + the hook call) that a parent
 * mounts/unmounts — the same "unmount on close" pattern the hook's own
 * docstring documents for real consumers. The Tab/Escape handler binds to
 * `window`, so it's driven via `fireEvent.keyDown(window, ...)`.
 */

import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

import { FOCUSABLE, useFocusTrap, type FocusTarget } from './useFocusTrap';

afterEach(cleanup);

interface DialogProps {
  onEscape: () => void;
  focusTarget?: FocusTarget;
  /** False renders a dialog with no focusable children (fallback case). */
  withFocusables?: boolean;
}

function Dialog({ onEscape, focusTarget, withFocusables = true }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, {
    onEscape,
    ...(focusTarget !== undefined ? { focusTarget } : {}),
  });
  return (
    <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} data-testid="dialog">
      {withFocusables && (
        <>
          <button>first</button>
          <button>second</button>
          {/* Every opt-out shape FOCUSABLE promises to skip, in one run between
              `second` and `third`: disabled, and tabIndex={-1} on each of the
              element kinds the selector names. The input is ImportBuilder's
              real shape; the button and link cover the clauses BI-051 fixed. */}
          <button disabled>disabled</button>
          <input tabIndex={-1} aria-hidden="true" readOnly value="inert" />
          <button tabIndex={-1}>inert button</button>
          <a href="#inert" tabIndex={-1}>
            inert link
          </a>
          <button>third</button>
        </>
      )}
    </div>
  );
}

interface HarnessProps {
  open: boolean;
  onEscape: () => void;
  focusTarget?: FocusTarget;
  withFocusables?: boolean;
}

function Harness({ open, onEscape, focusTarget, withFocusables }: HarnessProps) {
  return (
    <div>
      <button>opener</button>
      {open && (
        <Dialog
          onEscape={onEscape}
          {...(focusTarget !== undefined ? { focusTarget } : {})}
          {...(withFocusables !== undefined ? { withFocusables } : {})}
        />
      )}
    </div>
  );
}

describe('useFocusTrap — open / restore', () => {
  it('moves focus to the first enabled focusable by default', () => {
    const { getByText, rerender } = render(<Harness open={false} onEscape={vi.fn()} />);
    const opener = getByText('opener');
    opener.focus();

    rerender(<Harness open={true} onEscape={vi.fn()} />);

    expect(document.activeElement).toBe(getByText('first'));
  });

  it("moves focus to the dialog container for focusTarget: 'dialog'", () => {
    const { getByTestId, rerender } = render(<Harness open={false} onEscape={vi.fn()} focusTarget="dialog" />);
    rerender(<Harness open={true} onEscape={vi.fn()} focusTarget="dialog" />);

    expect(document.activeElement).toBe(getByTestId('dialog'));
  });

  it('falls back to the dialog container when there are no focusable children', () => {
    const { getByTestId, rerender } = render(
      <Harness open={false} onEscape={vi.fn()} withFocusables={false} />,
    );
    rerender(<Harness open={true} onEscape={vi.fn()} withFocusables={false} />);

    expect(document.activeElement).toBe(getByTestId('dialog'));
  });

  it('restores focus to the opener on unmount', () => {
    const { getByText, rerender } = render(<Harness open={false} onEscape={vi.fn()} />);
    const opener = getByText('opener');
    opener.focus();

    rerender(<Harness open={true} onEscape={vi.fn()} />);
    expect(document.activeElement).not.toBe(opener);

    rerender(<Harness open={false} onEscape={vi.fn()} />);
    expect(document.activeElement).toBe(opener);
  });
});

describe('useFocusTrap — Tab cycling', () => {
  it('wraps Tab from the last focusable to the first', () => {
    const { getByText, rerender } = render(<Harness open={false} onEscape={vi.fn()} />);
    rerender(<Harness open={true} onEscape={vi.fn()} />);

    getByText('third').focus();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(document.activeElement).toBe(getByText('first'));
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    const { getByText, rerender } = render(<Harness open={false} onEscape={vi.fn()} />);
    rerender(<Harness open={true} onEscape={vi.fn()} />);

    expect(document.activeElement).toBe(getByText('first'));
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(getByText('third'));
  });

  it('excludes disabled and tabIndex={-1} controls from the cycle', () => {
    const { getByText, rerender } = render(<Harness open={false} onEscape={vi.fn()} />);
    rerender(<Harness open={true} onEscape={vi.fn()} />);

    // One Tab hops the whole opt-out run: disabled button, inert input,
    // inert button, inert link (BI-051 closed the last two).
    getByText('second').focus();
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(document.activeElement).toBe(getByText('third'));
  });

  it('excludes a tabIndex={-1} button and [href] from the trap targets (BI-051)', () => {
    const { getByText, getByTestId, rerender } = render(
      <Harness open={false} onEscape={vi.fn()} />,
    );
    rerender(<Harness open={true} onEscape={vi.fn()} />);

    const targets = Array.from(getByTestId('dialog').querySelectorAll(FOCUSABLE));

    expect(targets).toEqual([getByText('first'), getByText('second'), getByText('third')]);
    expect(targets).not.toContain(getByText('inert button'));
    expect(targets).not.toContain(getByText('inert link'));
  });

  it('enters at the first focusable on Tab when focus sits on the dialog container', () => {
    const { getByTestId, getByText, rerender } = render(
      <Harness open={false} onEscape={vi.fn()} focusTarget="dialog" />,
    );
    rerender(<Harness open={true} onEscape={vi.fn()} focusTarget="dialog" />);

    expect(document.activeElement).toBe(getByTestId('dialog'));
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(document.activeElement).toBe(getByText('first'));
  });

  it('enters at the last focusable on Shift+Tab when focus sits on the dialog container', () => {
    const { getByTestId, getByText, rerender } = render(
      <Harness open={false} onEscape={vi.fn()} focusTarget="dialog" />,
    );
    rerender(<Harness open={true} onEscape={vi.fn()} focusTarget="dialog" />);

    expect(document.activeElement).toBe(getByTestId('dialog'));
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(getByText('third'));
  });
});

describe('useFocusTrap — Escape', () => {
  it('invokes onEscape', () => {
    const onEscape = vi.fn();
    const { rerender } = render(<Harness open={false} onEscape={onEscape} />);
    rerender(<Harness open={true} onEscape={onEscape} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('re-reads onEscape each keydown, so a swapped-in callback fires instead of the stale one', () => {
    const stale = vi.fn();
    const fresh = vi.fn();
    const { rerender } = render(<Harness open={false} onEscape={stale} />);
    rerender(<Harness open={true} onEscape={stale} />);

    rerender(<Harness open={true} onEscape={fresh} />);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(stale).not.toHaveBeenCalled();
    expect(fresh).toHaveBeenCalledTimes(1);
  });
});
