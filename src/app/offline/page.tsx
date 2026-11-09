"use client";

import { useMemo, useSyncExternalStore } from "react";
import { WifiOff, RotateCcw } from "lucide-react";
import { StatusScreen } from "@/components/layout/status-screen";
import { BRANDING_CACHE_KEY, parseBrandingCache } from "@/lib/theme/branding-cache";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("online", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("online", onChange);
  };
}

function readRaw() {
  try {
    return localStorage.getItem(BRANDING_CACHE_KEY) ?? "";
  } catch {
    return "";
  }
}

export default function OfflinePage() {
  // Lê a marca guardada no navegador (sem efeito nem setState). No servidor, a tela sai com a marca padrão.
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const branding = useMemo(() => parseBrandingCache(raw), [raw]);

  return (
    <StatusScreen
      branding={branding}
      icon={WifiOff}
      title="Sem sinal de internet"
      description="Você está offline. As páginas que já abriu continuam disponíveis, e esta tela atualiza sozinha quando a conexão voltar."
    >
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--tf-ember-dim)]"
      >
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
    </StatusScreen>
  );
}
