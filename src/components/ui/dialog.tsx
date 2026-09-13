"use client";

import { useState, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

const SIZE_CLASS = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
} as const;

export function Dialog({
  trigger,
  title,
  description,
  children,
  open: controlledOpen,
  onOpenChange,
  size = "md",
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: (close: () => void) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Largura do modal. Padrão "md" (mais largo que o antigo max-w-lg fixo). */
  size?: keyof typeof SIZE_CLASS;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function setOpen(value: boolean) {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {trigger && (
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className={`relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-[16px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:rounded-[var(--radius)] ${SIZE_CLASS[size]}`}
          >
            <div className="-mt-1.5 mb-3 flex justify-center sm:hidden" aria-hidden="true">
              <span className="h-1 w-9 rounded-full bg-[var(--border)]" />
            </div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl">{title}</h2>
                {description && <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}