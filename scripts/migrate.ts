// Aplica as migrations de src/db/migrations usando o MESMO driver do app (neon-http).
// Uso: npm run db:migrate:app
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida no .env");

  const sql = neon(url);
  const db = drizzle(sql);

  console.log("→ Aplicando migrations de ./src/db/migrations ...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("✓ migrate() concluído");

  const last = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`;
  console.log("✓ Última migration registrada:", last[0] ?? "nenhuma");

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('provisional_password_enc', 'first_access_at')`;
  const found = cols.map((c) => c.column_name as string);
  console.log(
    found.length === 2
      ? "✓ Colunas OK em users: provisional_password_enc, first_access_at"
      : `✗ Faltando em users. Encontradas: ${found.join(", ") || "nenhuma"}`
  );
  if (found.length !== 2) process.exitCode = 1;
}

main().catch((err) => {
  console.error("✗ Falha na migração:", err);
  process.exit(1);
});
