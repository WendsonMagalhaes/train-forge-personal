// Uso ÚNICO, quando o banco já tem o schema (criado antes por db:push ou outro processo),
// mas o histórico de migrations (drizzle.__drizzle_migrations) está vazio.
// Registra as migrations já aplicadas (0000..0003) SEM executar o SQL delas.
// Depois, rode: npm run db:migrate:app
// Uso: npm run db:baseline
import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { neon } from "@neondatabase/serverless";

const MIGRATIONS_DIR = "./src/db/migrations";
const BASELINE_TAGS = [
  "0000_serious_living_tribunal",
  "0001_spicy_sleepwalker",
  "0002_logo_dark_url",
  "0003_finance_lock",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida no .env");
  const sql = neon(url);

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
  if (n > 0) {
    console.log(`Histórico já tem ${n} registro(s). Nada a fazer. Rode: npm run db:migrate:app`);
    return;
  }

  const [{ ok }] = await sql`SELECT to_regclass('public.users') IS NOT NULL AS ok`;
  if (!ok) throw new Error("Tabela users não existe: o baseline só vale para um banco já criado.");

  const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"));
  for (const tag of BASELINE_TAGS) {
    const entry = journal.entries.find((e: { tag: string }) => e.tag === tag);
    if (!entry) throw new Error(`Entrada ${tag} não encontrada no journal`);
    const content = readFileSync(join(MIGRATIONS_DIR, `${tag}.sql`), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${entry.when})`;
    console.log(`✓ baseline ${tag}`);
  }
  console.log("✓ Histórico registrado. Agora rode: npm run db:migrate:app");
}

main().catch((err) => {
  console.error("✗ Falha no baseline:", err.message ?? err);
  process.exit(1);
});
