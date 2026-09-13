"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="h-10 w-10 text-[var(--primary)]" />
      <div>
        <p className="font-display text-xl">Algo deu errado</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tente novamente. Se o problema continuar, avise seu personal ou o suporte.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[var(--muted)]">Ref: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--tf-ember-dim)]"
      >
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
    </main>
  );
}
