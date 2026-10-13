import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinner inline (ícone girando) com texto acessível para leitores de tela. */
export function Spinner({ className, label = "Carregando…" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center justify-center">
      <Loader2 className={cn("h-5 w-5 animate-spin text-[var(--primary)]", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Tela de carregamento de rota — usada nos `loading.tsx` do app. */
export function PageLoading({ label = "Carregando página…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-6 w-6" label={label} />
    </div>
  );
}
