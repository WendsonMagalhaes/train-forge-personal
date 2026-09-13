import type { CSSProperties } from "react";

// Pequeno utilitário de cor — sem dependências externas.
// A partir de UMA cor de marca (escolhida pelo personal), derivamos:
// - a própria cor (uso em botões, links, destaques)
// - uma variante "dim" (hover/pressed), mais escura
// - uma variante de contraste (preto ou branco) pro texto sobre a cor

export const DEFAULT_BRAND_COLOR = "#fdc903"; // dourado padrão do Train Forge

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean,
    16
  );
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function darken(hex: string, amount = 0.18) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

export function contrastText(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  // luminância relativa aproximada (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#17130f" : "#ffffff";
}

export function isValidHex(value: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

/** Presets sugeridos na tela de personalização — cobrem uma boa variedade sem ficar genérico */
export const BRAND_COLOR_PRESETS = [
  { name: "Dourado (padrão)", value: "#fdc903" },
  { name: "Laranja-ember", value: "#ff6a3d" },
  { name: "Verde-oliva", value: "#7a8b4f" },
  { name: "Azul-petróleo", value: "#2b6f77" },
  { name: "Roxo-ametista", value: "#7c5cbf" },
  { name: "Vermelho-tijolo", value: "#b5432f" },
  { name: "Rosa-magenta", value: "#c2437e" },
  { name: "Azul-royal", value: "#3457d5" },
];

export function buildBrandStyle(brandColor: string | null | undefined): CSSProperties {
  const color = brandColor && isValidHex(brandColor) ? brandColor : DEFAULT_BRAND_COLOR;
  return {
    ["--primary" as string]: color,
    ["--tf-ember" as string]: color,
    ["--tf-ember-dim" as string]: darken(color),
    ["--primary-foreground" as string]: contrastText(color),
  };
}
