import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/db";
import { exercises } from "../src/db/schema";
import { eq } from "drizzle-orm";

type Entry = { name?: string; instructions?: string[] | null };

// Importa as instruções traduzidas de um JSON indexado pelo ID da API externa
// (o mesmo valor gravado em exercises.external_id).
// Uso: npx tsx scripts/import-pt-translations.ts /caminho/pt-BR.json
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Uso: npx tsx scripts/import-pt-translations.ts /caminho/pt-BR.json");

  const data = JSON.parse(readFileSync(file, "utf-8")) as Record<string, Entry>;
  let updated = 0;
  let skipped = 0;

  for (const [externalId, entry] of Object.entries(data)) {
    if (!entry.instructions || entry.instructions.length === 0) {
      skipped++;
      continue;
    }
    const text = entry.instructions.join("\n");
    const rows = await db
      .update(exercises)
      .set({ instructionsPt: text })
      .where(eq(exercises.externalId, externalId))
      .returning({ id: exercises.id });
    updated += rows.length;
  }

  console.log(`Exercícios atualizados: ${updated}. Entradas sem instruções no arquivo: ${skipped}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
