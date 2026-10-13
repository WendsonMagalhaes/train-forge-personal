"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Dentro de um <Link>: mostra o próprio conteúdo normalmente e, enquanto a
 * navegação para aquele link está pendente, troca pelo spinner. Usado nos
 * ícones da barra de navegação para dar feedback imediato ao clicar.
 */
export function LinkStatusSwap({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" aria-hidden="true" /> : <>{children}</>;
}

/** Spinner pequeno que só aparece enquanto o link está pendente (ex.: abas de texto). */
export function LinkPendingSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className={`h-3.5 w-3.5 animate-spin ${className ?? ""}`} aria-hidden="true" />;
}
