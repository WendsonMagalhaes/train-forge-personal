"use client";

import { useEffect } from "react";
import type { Branding } from "@/lib/theme/resolve-brand-color";
import { BRANDING_CACHE_KEY } from "@/lib/theme/branding-cache";

/** Guarda a marca atual no navegador a cada visita online, para a tela offline usar depois. */
export function BrandingCache({ branding }: { branding: Branding }) {
  const serialized = JSON.stringify(branding);

  useEffect(() => {
    try {
      localStorage.setItem(BRANDING_CACHE_KEY, serialized);
    } catch {
      // armazenamento indisponível (modo privado, cota cheia): a tela offline cai na logo padrão
    }
  }, [serialized]);

  return null;
}
