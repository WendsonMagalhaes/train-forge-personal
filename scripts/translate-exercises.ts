import "dotenv/config";
import { translatePendingInstructions } from "../src/lib/i18n/translate";

// Traduz em lotes todas as instruções que ainda não estão em português.
// Uso: npx tsx scripts/translate-exercises.ts
async function main() {
  let total = 0;
  while (true) {
    const done = await translatePendingInstructions({ limit: 100 });
    if (done === 0) break;
    total += done;
    console.log(`Traduzidos até agora: ${total}`);
  }
  console.log(`Concluído. Total traduzido: ${total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
