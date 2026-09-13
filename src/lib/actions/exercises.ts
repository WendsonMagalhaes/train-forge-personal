// lib/actions/exercises.ts
"use server";

import { db } from "@/db";
import { exercises, exerciseSubstitutes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, ilike, or, sql, notInArray, inArray } from "drizzle-orm";
import { revalidatePath, unstable_cache } from "next/cache";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/constants";
import { fetchExternalExercises, mapToMuscleGroup } from "@/lib/exercise-api";
import { z } from "zod";

const exerciseSchema = z.object({
  name: z.string().min(2, "Informe o nome do exercício"),
  muscleGroup: z.enum(MUSCLE_GROUPS as unknown as [MuscleGroup, ...MuscleGroup[]]),
  equipment: z.string().optional(),
  videoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instructions: z.string().optional(),
});

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");
  return session.user;
}

export async function listExercises() {
  const trainer = await requireTrainer();
  return db
    .select()
    .from(exercises)
    .where(eq(exercises.trainerId, trainer.id))
    .orderBy(desc(exercises.createdAt));
}

/**
 * Busca exercícios da biblioteca do trainer com filtro por nome/grupo muscular.
 * Usado no autocomplete de montagem de ficha, onde a biblioteca pode ter
 * centenas de itens depois de uma importação da API externa.
 */
export async function searchExercises(query: string, muscleGroup?: MuscleGroup, limit = 40) {
  const trainer = await requireTrainer();

  const conditions = [eq(exercises.trainerId, trainer.id)];
  if (query.trim()) {
    conditions.push(
      or(ilike(exercises.name, `%${query.trim()}%`), ilike(exercises.muscleGroupDetail, `%${query.trim()}%`))!
    );
  }
  if (muscleGroup) conditions.push(eq(exercises.muscleGroup, muscleGroup));

  return db
    .select()
    .from(exercises)
    .where(and(...conditions))
    .orderBy(exercises.name)
    .limit(limit);
}

export async function createExercise(formData: FormData) {
  const trainer = await requireTrainer();

  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment") || undefined,
    videoUrl: formData.get("videoUrl") || "",
    imageUrl: formData.get("imageUrl") || "",
    instructions: formData.get("instructions") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(exercises)
    .values({
      trainerId: trainer.id,
      name: parsed.data.name,
      muscleGroup: parsed.data.muscleGroup,
      equipment: parsed.data.equipment,
      videoUrl: parsed.data.videoUrl || undefined,
      imageUrl: parsed.data.imageUrl || undefined,
      instructions: parsed.data.instructions,
      source: "custom",
    })
    .returning({ id: exercises.id });

  // Substitutos já escolhidos no momento da criação (exercícios que trabalham
  // os mesmos músculos). Ignora silenciosamente ids que não pertencem ao
  // personal — o multi-select só oferece os dele, mas o formData é input do cliente.
  const substituteIds = formData.getAll("substituteIds").map(String).filter(Boolean);
  await linkSubstitutes(trainer.id, created.id, substituteIds);

  revalidatePath("/dashboard/exercises");
  return { success: true };
}

/** Valida que os ids pertencem ao personal e (re)grava a lista de substitutos de um exercício. */
async function linkSubstitutes(trainerId: string, exerciseId: string, substituteIds: string[]) {
  const cleanIds = [...new Set(substituteIds)].filter((id) => id !== exerciseId);
  if (cleanIds.length === 0) return;

  const owned = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.trainerId, trainerId), inArray(exercises.id, cleanIds)));

  const validIds = owned.map((o) => o.id);
  if (validIds.length === 0) return;

  await db
    .insert(exerciseSubstitutes)
    .values(validIds.map((substituteExerciseId) => ({ exerciseId, substituteExerciseId })))
    .onConflictDoNothing();
}

/**
 * Substitui a lista de exercícios substitutos de um exercício (relação
 * direcional: "exerciseId tem substituteIds como alternativa"). Chamado pelo
 * botão "Gerenciar substitutos" na biblioteca de exercícios.
 */
export async function setExerciseSubstitutes(exerciseId: string, formData: FormData) {
  const trainer = await requireTrainer();

  const [owned] = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.trainerId, trainer.id)))
    .limit(1);
  if (!owned) return { error: "Exercício não encontrado." };

  const substituteIds = formData.getAll("substituteIds").map(String).filter(Boolean);

  await db.delete(exerciseSubstitutes).where(eq(exerciseSubstitutes.exerciseId, exerciseId));
  await linkSubstitutes(trainer.id, exerciseId, substituteIds);

  revalidatePath("/dashboard/exercises");
  return { success: true };
}

/**
 * Retorna, pra cada exercício do personal, os ids dos seus substitutos —
 * usado na biblioteca pra resolver os nomes/imagens a partir da lista já
 * carregada em `listExercises()`, sem 1 query por card.
 */
export async function listExerciseSubstituteIds(): Promise<Record<string, string[]>> {
  const trainer = await requireTrainer();

  const rows = await db
    .select({ exerciseId: exerciseSubstitutes.exerciseId, substituteExerciseId: exerciseSubstitutes.substituteExerciseId })
    .from(exerciseSubstitutes)
    .innerJoin(exercises, eq(exercises.id, exerciseSubstitutes.exerciseId))
    .where(eq(exercises.trainerId, trainer.id));

  const map: Record<string, string[]> = {};
  for (const row of rows) {
    (map[row.exerciseId] ??= []).push(row.substituteExerciseId);
  }
  return map;
}

export async function deleteExercise(id: string) {
  const trainer = await requireTrainer();
  await db.delete(exercises).where(and(eq(exercises.id, id), eq(exercises.trainerId, trainer.id)));
  revalidatePath("/dashboard/exercises");
}

/**
 * Lógica pura de import/upsert/limpeza, sem chamar auth() ou revalidatePath()
 * aqui dentro. Isso é proposital: essa função é reaproveitada dentro de
 * unstable_cache (sync automático), que não permite APIs dinâmicas de
 * request (cookies/headers) no seu escopo. Recebe o trainerId já resolvido
 * por quem chama.
 */
async function importExercisesForTrainer(trainerId: string) {
  const externalExercises = await fetchExternalExercises();
  if (externalExercises.length === 0) return { success: true, imported: 0 };

  const externalIds = externalExercises.map((ex) => String(ex.id));

  let imported = 0;
  const batchSize = 50;
  for (let i = 0; i < externalExercises.length; i += batchSize) {
    const batch = externalExercises.slice(i, i + batchSize);
    await db
      .insert(exercises)
      .values(
        batch.map((ex) => ({
          trainerId,
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
          movementPattern: sql`excluded.movement_pattern`,
        },
      });
    imported += batch.length;
  }

  // remove da biblioteca do trainer os exercícios de origem "api" que não
  // vieram mais na resposta atual (removidos/renomeados na fonte) —
  // exercícios "custom" nunca são tocados aqui
  await db
    .delete(exercises)
    .where(
      and(
        eq(exercises.trainerId, trainerId),
        eq(exercises.source, "api"),
        notInArray(exercises.externalId, externalIds)
      )
    );

  return { success: true, imported };
}

/**
 * Import manual, disparado pelo botão "Importar da API".
 * Roda sem cache/throttle e revalida a página imediatamente.
 */
export async function importExercisesFromApi() {
  const trainer = await requireTrainer();
  const result = await importExercisesForTrainer(trainer.id);
  revalidatePath("/dashboard/exercises");
  return result;
}

// Janela de throttle do sync automático. Ajuste conforme a frequência
// com que a API externa costuma mudar (ex: 30 min é um bom padrão).
const SYNC_INTERVAL_SECONDS = 60 * 30;

const getCachedSync = unstable_cache(
  (trainerId: string) => importExercisesForTrainer(trainerId),
  ["exercises-auto-sync"],
  { revalidate: SYNC_INTERVAL_SECONDS }
);

/**
 * Chamado automaticamente ao carregar a página de exercícios.
 * Faz o sync com a API externa no máximo 1x por SYNC_INTERVAL_SECONDS
 * por trainer — nas demais visitas dentro da janela, é praticamente
 * instantâneo (não bate na API nem no banco de novo). Se a API externa
 * falhar, não derruba a página: só loga o erro e segue com os dados
 * já existentes no banco.
 */
export async function syncExercisesOnLoad() {
  const trainer = await requireTrainer();
  try {
    await getCachedSync(trainer.id);
  } catch (err) {
    console.error("Sincronização automática de exercícios falhou:", err);
  }
}