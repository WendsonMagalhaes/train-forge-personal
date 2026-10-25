// Utilitários de data sem dependência de servidor (usáveis em client e server).
// Datas "só dia" (yyyy-mm-dd) NÃO podem passar por new Date("yyyy-mm-dd"):
// isso vira meia-noite UTC e aparece como o dia anterior no Brasil.

const SP_TZ = "America/Sao_Paulo";

/** Data de hoje no fuso do Brasil, em yyyy-mm-dd. */
export function dateInSaoPaulo(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Converte yyyy-mm-dd em Date à meia-noite do fuso local (sem deslocar o dia). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Formata uma data só-dia para exibição em pt-BR, sem deslocar o dia. */
export function formatDateOnly(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" },
): string {
  return parseDateOnly(value).toLocaleDateString("pt-BR", options);
}
