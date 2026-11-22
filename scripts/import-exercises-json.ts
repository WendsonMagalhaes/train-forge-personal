import "dotenv/config";
import { readFileSync } from "fs";
import { db } from "@/db";
import { exercises, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { mapToMuscleGroup, type ExternalExercise } from "@/lib/exercise-api";

// Importa exercícios a partir de um JSON local, no mesmo formato da API.
// Novos são inseridos; existentes (mesmo externalId) são atualizados.
// Nada é apagado.
// Uso: npx tsx scripts/import-exercises-json.ts <arquivo.json> <email-do-personal>

async function main() {
  const [file, trainerEmail] = process.argv.slice(2);
  if (!file || !trainerEmail) {
    console.error("Uso: npx tsx scripts/import-exercises-json.ts <arquivo.json> <email-do-personal>");
    process.exit(1);
  }

  const [trainer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, trainerEmail))
    .limit(1);
  if (!trainer) throw new Error(`Personal não encontrado: ${trainerEmail}`);

  const json = JSON.parse(readFileSync(file, "utf-8"));
  const list: ExternalExercise[] = Array.isArray(json) ? json : json?.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Arquivo sem lista de exercícios");
  }

  const batchSize = 50;
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    await db
      .insert(exercises)
      .values(
        batch.map((ex) => ({
          trainerId: trainer.id,
          name: ex.nome,
          muscleGroup: mapToMuscleGroup(ex.grupoMuscularPrincipal, ex.categoria),
          muscleGroupDetail: ex.grupoMuscularPrincipal,
          secondaryMuscles: ex.musculosSecundarios ?? [],
          category: ex.categoria,
          movementPattern: ex.padraoMovimento,
          videoUrl: ex.gif,
          instructions: ex.descricao,
          source: "api",
          externalId: String(ex.id),
        }))
      )
      .onConflictDoUpdate({
        target: [exercises.trainerId, exercises.externalId],
        set: {
          name: sql`excluded.name`,
          videoUrl: sql`excluded.video_url`,
          instructions: sql`excluded.instructions`,
          muscleGroupDetail: sql`excluded.muscle_group_detail`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          category: sql`excluded.category`,
          muscleGroup: sql`excluded.muscle_group`,
          movementPattern: sql`excluded.movement_pattern`,
        },
      });
    console.log(`Processados ${Math.min(i + batchSize, list.length)}/${list.length}`);
  }

  console.log("Importação concluída: novos inseridos, existentes atualizados, nada removido.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
