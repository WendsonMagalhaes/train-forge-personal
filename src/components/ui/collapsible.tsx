"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Seção retrátil. O cabeçalho clicável (título + resumo + chevron) alterna
 * aberto/fechado; os botões em `actions` ficam fora dele e não o disparam.
 */
export function Collapsible({
  title,
  summary,
  actions,
  defaultOpen = true,
  children,
  className,
}: {
  title: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius)] py-1 text-left transition-colors hover:text-[var(--primary)]"
        >
          <span className="flex min-w-0 flex-1 flex-col items-start gap-1">{title}</span>
          {summary && <span className="shrink-0 text-xs text-[var(--muted)]">{summary}</span>}
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-[var(--muted)] transition-transform duration-200 group-hover:text-[var(--foreground)]",
              !open && "-rotate-90"
            )}
            aria-hidden="true"
          />
        </button>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {open && <div className="mt-4 border-t border-[var(--border)] pt-4">{children}</div>}
    </div>
  );
}
