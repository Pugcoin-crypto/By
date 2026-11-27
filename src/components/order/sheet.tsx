"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * Bottom sheet on phones, centred dialog (or side drawer) on larger screens.
 * Closes on Escape and on a click outside; locks page scroll while open.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Bezárás" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        className={
          side
            ? "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface outline-none sm:border-l sm:border-white/10"
            : "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-card bg-surface outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:border sm:border-white/10"
        }
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Bezárás"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-white/80 hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const btn = size === "sm" ? "size-9" : "size-11";
  return (
    <div className="inline-flex items-center rounded-full bg-surface-2">
      <button
        type="button"
        aria-label="Kevesebb"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={`${btn} grid place-items-center rounded-full text-white disabled:opacity-30`}
      >
        <span className="text-xl leading-none">−</span>
      </button>
      <span className="min-w-8 text-center font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Több"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={`${btn} grid place-items-center rounded-full text-white disabled:opacity-30`}
      >
        <span className="text-xl leading-none">+</span>
      </button>
    </div>
  );
}
