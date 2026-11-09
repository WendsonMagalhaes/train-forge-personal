// Padrão de textos do Train Forge:
// - No banco, textos digitados pelo personal são gravados em MAIÚSCULAS.
// - Na tela, são exibidos em UpperCamelCase (cada palavra com inicial maiúscula),
//   mantendo em minúsculas as partículas do português ("de", "da", "do", "e"...).
// E-mail NÃO entra aqui: o login compara o e-mail exatamente como está gravado.

// Palavras de ligação que ficam sempre em minúsculo (exceto quando iniciam o texto):
// "Puxada na Polia Alta com Pegada Fechada", "Costas e Bíceps", "Treino de Pernas".
const PARTICLES = new Set([
  "de", "da", "do", "das", "dos", "e", "com", "na", "no", "nas", "nos",
  "em", "por", "para", "pelo", "pela", "ao", "aos", "a", "à", "as", "o", "os", "ou", "sem",
]);

/** Limpa espaços sobrando e converte para maiúsculas antes de gravar no banco. */
export function toDbText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
}

/** Igual a toDbText, mas devolve null quando o texto fica vazio (campos opcionais). */
export function toDbTextOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const cleaned = toDbText(value);
  return cleaned === "" ? null : cleaned;
}

function capitalize(word: string): string {
  // inicial maiúscula também depois de hífen, barra, parêntese e aspas: "Silva-Souza", "Glúteos/Posterior", "(Alongamento"
  return word.replace(/(^|[-/(\[“"])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("pt-BR"));
}

/** Converte o texto guardado no banco para exibição em UpperCamelCase. */
export function toDisplayText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((word, i) => (i > 0 && PARTICLES.has(word) ? word : capitalize(word)))
    .join(" ");
}
