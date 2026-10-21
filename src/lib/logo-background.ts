/**
 * Remove o fundo (sólido) de uma logo, direto no navegador (canvas), e devolve um PNG com transparência.
 *
 * Como funciona:
 * 1. Descobre a cor do fundo olhando a borda da imagem (mediana dos pixels da borda).
 * 2. Faz um "flood fill" a partir da borda: só remove o fundo que está ligado às bordas.
 *    Assim, detalhes da logo com a mesma cor do fundo (ex.: letras pretas no meio de um
 *    desenho branco) não somem.
 * 3. Suaviza a borda do recorte (antisserrilhado), para não ficar um contorno duro.
 *
 * Retorna null se a imagem já tem fundo transparente (nada a remover).
 * Funciona com fundos de cor sólida (preto, branco, cinza). Fundos com degradê ou foto não são removidos.
 */

const MAX_SIDE = 1600; // logos maiores são reduzidas — mais que isso não melhora nada na tela
const CORE_TOLERANCE = 60; // distância de cor até a qual o pixel é considerado fundo
const EDGE_TOLERANCE = 35; // faixa extra para suavizar a borda do recorte

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem da logo."));
    img.src = url;
  });
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

export async function removeLogoBackground(url: string): Promise<Blob | null> {
  const img = await loadImage(url);

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Seu navegador não permite processar a imagem.");
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;

  // 1) cor de fundo = mediana dos pixels da borda (opacos)
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  let transparentBorder = 0, borderCount = 0;
  const sampleBorder = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    borderCount++;
    if (px[i + 3] < 128) { transparentBorder++; return; }
    rs.push(px[i]); gs.push(px[i + 1]); bs.push(px[i + 2]);
  };
  for (let x = 0; x < w; x++) { sampleBorder(x, 0); sampleBorder(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { sampleBorder(0, y); sampleBorder(w - 1, y); }

  if (transparentBorder > borderCount / 2 || rs.length === 0) return null; // já é transparente
  const bgR = median(rs), bgG = median(gs), bgB = median(bs);

  const distance = (i: number) =>
    Math.sqrt((px[i] - bgR) ** 2 + (px[i + 1] - bgG) ** 2 + (px[i + 2] - bgB) ** 2);

  // 2) flood fill a partir da borda, só por pixels parecidos com o fundo
  const isBg = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (p: number) => {
    if (!isBg[p] && distance(p * 4) <= CORE_TOLERANCE) {
      isBg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + (w - 1)); }

  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w, y = (p - x) / w;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (y > 0) seed(p - w);
    if (y < h - 1) seed(p + w);
  }

  // 3) aplica transparência: fundo some; pixels na faixa de transição ficam semitransparentes
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (px[i + 3] === 0) continue;
    if (isBg[p]) {
      px[i + 3] = 0;
      continue;
    }
    // só suaviza pixels encostados no fundo removido
    const x = p % w, y = (p - x) / w;
    const touchesBg =
      (x > 0 && isBg[p - 1]) || (x < w - 1 && isBg[p + 1]) ||
      (y > 0 && isBg[p - w]) || (y < h - 1 && isBg[p + w]);
    if (touchesBg) {
      const d = distance(i);
      if (d < CORE_TOLERANCE + EDGE_TOLERANCE) {
        const t = (d - CORE_TOLERANCE) / EDGE_TOLERANCE; // 0 = fundo, 1 = cor da logo
        px[i + 3] = Math.round(px[i + 3] * Math.min(1, Math.max(0, t)));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/**
 * Gera a versão da logo para outro tema, trocando só as partes "neutras" (preto, branco, cinza).
 * - target "dark": partes pretas/cinzas escuras ficam claras (para fundo escuro); brancas continuam brancas.
 * - target "light": partes brancas/cinzas claras ficam escuras (para fundo claro); pretas continuam pretas.
 * Cores de marca (ex.: laranja) não mudam. Transparência é preservada.
 *
 * Ex.: logo preta com ícone laranja vira branca com ícone laranja no tema escuro.
 */
const NEUTRAL_SATURATION = 40; // abaixo disso o pixel é considerado cinza/neutro

export async function adaptLogoForTheme(url: string, target: "light" | "dark"): Promise<Blob> {
  const img = await loadImage(url);

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Seu navegador não permite processar a imagem.");
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const px = imageData.data;

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min >= NEUTRAL_SATURATION) continue; // cor de marca: mantém

    const lum = (r + g + b) / 3;
    // dark: empurra para o branco (preto → branco, branco fica branco)
    // light: empurra para o preto (branco → preto, preto fica preto)
    const next = target === "dark" ? Math.max(lum, 255 - lum) : Math.min(lum, 255 - lum);
    px[i] = px[i + 1] = px[i + 2] = Math.round(next);
  }

  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a versão da logo.");
  return blob;
}
