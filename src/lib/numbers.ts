// Conversão de números digitados em pt-BR ("1.250,50", "96,5") para número.
// Usado em formulários (sanitização) e nas actions (conversão antes de gravar).

/**
 * Sanitiza o texto digitado num campo decimal: mantém dígitos e uma vírgula.
 * - Com vírgula presente, pontos são removidos (são separadores de milhar).
 * - Sem vírgula, um ponto digitado vira a vírgula decimal.
 */
export function sanitizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (cleaned.includes(",")) {
    const [intPart, ...rest] = cleaned.split(",");
    const decimals = rest.join("").replace(/[.,]/g, "");
    return intPart.replace(/\./g, "") + "," + decimals;
  }
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot) + "," + cleaned.slice(dot + 1).replace(/\./g, "");
}

/**
 * Converte texto em número. Aceita "96", "96,5", "1.250,50" e "96." (vírgula no fim).
 * Sem vírgula, o ponto é tratado como decimal (ex.: "96.5"), o que cobre valores
 * vindos de fora da interface. Retorna null se vazio ou inválido.
 */
export function parseDecimalBR(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed === "") return null;

  let s = trimmed;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  s = s.replace(/\.$/, "");

  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
