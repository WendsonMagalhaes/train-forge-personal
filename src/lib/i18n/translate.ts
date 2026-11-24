import { db } from "@/db";
import { exercises } from "@/db/schema";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";

const MODEL = "claude-haiku-5-5";
const CHUNK_SIZE = 20;

/** Traduz uma lista de textos de instrução para português do Brasil, mantendo a ordem. */
export async function translateTexts(texts: string[]): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content:
            "Traduza para português do Brasil os textos de instrução de exercícios de academia abaixo. " +
            "Mantenha o sentido e um tom simples e direto. " +
            "Responda APENAS com um array JSON de strings, com o mesmo tamanho e a mesma ordem da entrada, sem texto extra.\n\n" +
            JSON.stringify(texts),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Falha na tradução (status ${res.status})`);

  const json = await res.json();
  const raw = (json.content as Array<{ type: string; text?: string }>)
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  if (!Array.isArray(parsed) || parsed.length !== texts.length) {
    throw new Error("Resposta de tradução inválida");
  }
  return parsed.map(String);
}

/**
 * Traduz as instruções ainda não traduzidas (instructions_pt nulo).
 * Se trainerId for informado, traduz só a biblioteca desse personal.
 * Devolve quantos exercícios foram traduzidos nesta rodada.
 */
export async function translatePendingInstructions(opts: { trainerId?: string; limit: number }): Promise<number> {
  const conditions = [isNull(exercises.instructionsPt), isNotNull(exercises.instructions), ne(exercises.instructions, "")];
  if (opts.trainerId) conditions.push(eq(exercises.trainerId, opts.trainerId));

  const pending = await db
    .select({ id: exercises.id, text: exercises.instructions })
    .from(exercises)
    .where(and(...conditions))
    .limit(opts.limit);

  let done = 0;
  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const chunk = pending.slice(i, i + CHUNK_SIZE);
    const translated = await translateTexts(chunk.map((p) => p.text as string));
    for (let j = 0; j < chunk.length; j++) {
      await db.update(exercises).set({ instructionsPt: translated[j] }).where(eq(exercises.id, chunk[j].id));
      done++;
    }
  }
  return done;
}
