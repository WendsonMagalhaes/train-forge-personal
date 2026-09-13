/**
 * Extração simples de paleta de cores a partir de uma imagem, 100% no browser
 * (canvas), sem dependências externas. Usada pra sugerir, na tela de
 * personalização, cores de marca extraídas direto da logo do personal.
 *
 * Se a imagem for de outra origem sem CORS liberado, o canvas fica "tainted"
 * e a leitura de pixels falha — nesse caso devolvemos uma lista vazia
 * silenciosamente (a extração é um "plus", nunca deve quebrar o upload).
 */

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexDistance(a: string, b: string) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

export async function extractPaletteFromImageUrl(url: string, maxColors = 6): Promise<string[]> {
  if (!url) return [];

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const size = 64; // amostra pequena já é suficiente pra achar as cores dominantes
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve([]);

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const STEP = 24; // quantização — agrupa tons próximos no mesmo "balde"
        const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue; // ignora pixels transparentes (comum em logos PNG/SVG)

          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max > 245 && min > 235) continue; // ignora quase-branco puro
          if (max < 18) continue; // ignora quase-preto puro

          const key = `${Math.round(r / STEP)}-${Math.round(g / STEP)}-${Math.round(b / STEP)}`;
          const bucket = buckets.get(key);
          if (bucket) {
            bucket.count++;
            bucket.r += r;
            bucket.g += g;
            bucket.b += b;
          } else {
            buckets.set(key, { count: 1, r, g, b });
          }
        }

        const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
        const colors: string[] = [];
        for (const bucket of sorted) {
          const hex = rgbToHex(bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count);
          if (colors.some((c) => hexDistance(c, hex) < 40)) continue; // evita cores quase idênticas na paleta final
          colors.push(hex);
          if (colors.length >= maxColors) break;
        }

        resolve(colors);
      } catch {
        resolve([]);
      }
    };

    img.onerror = () => resolve([]);
    img.src = url;
  });
}
