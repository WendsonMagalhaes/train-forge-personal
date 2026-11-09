import { z } from "zod";
import { parseDecimalBR } from "@/lib/numbers";

// Campos numéricos chegam do formulário como TEXTO ("1.250,5", "12", "").
// Estes schemas convertem para número na validação, então o banco recebe número.

/** Decimal opcional: vazio vira undefined; valor inválido gera erro de validação. */
export const optionalDecimal = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return undefined;
    const n = parseDecimalBR(value);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Valor numérico inválido." });
      return undefined;
    }
    return n;
  });

/** Inteiro opcional (arredondado). */
export const optionalInt = optionalDecimal.transform((n) => (n === undefined ? undefined : Math.round(n)));

/** Inteiro obrigatório com mínimo. */
export function requiredInt(message: string, min = 1) {
  return z.union([z.string(), z.number()]).transform((value, ctx) => {
    const n = parseDecimalBR(value);
    if (n === null || !Number.isInteger(n) || n < min) {
      ctx.addIssue({ code: "custom", message });
      return min;
    }
    return n;
  });
}
