'use client';

/**
 * blastimage — Sidebar project name draft input (BI-067.3)
 *
 * The inline New/Rename project editor (BI-053.2), split out of {@link Sidebar}.
 * Mounted per open: takes focus, Enter or blur submits the trimmed text, Escape
 * cancels. Sidebar owns only which draft is open and what a submit means.
 */

import { useEffect, useRef, useState } from 'react';

interface SidebarDraftInputProps {
  ariaLabel: string;
  className: string;
  initialValue: string;
  placeholder?: string;
  /** Receives the trimmed text, possibly empty; the caller decides what empty means. */
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export default function SidebarDraftInput({
  ariaLabel,
  className,
  initialValue,
  placeholder,
  onSubmit,
  onCancel,
}: SidebarDraftInputProps) {
  const [value, setValue] = useState(initialValue);
  // Enter unmounts the input, which fires blur in the browser; the ref is what
  // makes the second submit a no-op (setState would still see it unsettled).
  const settledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(): void {
    if (settledRef.current) return;
    settledRef.current = true;
    onSubmit(value.trim());
  }

  function cancel(): void {
    settledRef.current = true;
    onCancel();
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }

  return (
    <input
      ref={inputRef}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={submit}
    />
  );
}
