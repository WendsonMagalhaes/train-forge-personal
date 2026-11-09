import type { Branding } from "@/lib/theme/resolve-brand-color";

// Cópia da marca do personal guardada no navegador. Serve para a tela offline,
// que precisa mostrar a logo mesmo sem conexão (quando o servidor não responde).
export const BRANDING_CACHE_KEY = "tf-branding";

/** Converte o valor guardado no navegador de volta para Branding, ou null se estiver inválido. */
export function parseBrandingCache(raw: string): Branding | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Branding>;
    return {
      brandColor: value.brandColor ?? null,
      logoUrl: value.logoUrl ?? null,
      logoDarkUrl: value.logoDarkUrl ?? null,
      logoSizePct: value.logoSizePct ?? 100,
      logoPositionX: value.logoPositionX ?? 50,
      logoPositionY: value.logoPositionY ?? 50,
    };
  } catch {
    return null;
  }
}
