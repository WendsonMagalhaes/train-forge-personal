"use server";

import { db } from "@/db";
import {
  students, workoutCycles, workoutPlans, workoutBlocks, workoutBlockExercises, exercises,
  workoutLogs, workoutLogExercises, exerciseSubstitutes,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, like, asc, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const WEEKDAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

async function requireStudent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Não autorizado");

  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id)).limit(1);
  if (!student) throw new Error("Perfil de aluno não encontrado");
  return student;
}

// Regra simples de progressão: olha a última execução registrada desse exercício
// (carga real + RPE) e sugere a próxima carga.
function suggestNextLoad(lastLoadKg: number | null, lastRpe: number | null, hadPain: boolean) {
  if (lastLoadKg == null) {
    return { suggestedLoadKg: null, rationale: null };
  }
  if (hadPain) {
    return { suggestedLoadKg: lastLoadKg, rationale: "Manter carga — houve dor na última execução" };
  }
  if (lastRpe == null) {
    return { suggestedLoadKg: lastLoadKg, rationale: "Repetir última carga registrada" };
  }
  if (lastRpe <= 6) {
    const next = Math.round((lastLoadKg * 1.05) * 2) / 2; // arredonda pra 0.5kg
    return { suggestedLoadKg: next > lastLoadKg ? next : lastLoadKg + 0.5, rationale: "RPE baixo na última vez — aumente a carga" };
  }
  if (lastRpe <= 8) {
    return { suggestedLoadKg: lastLoadKg, rationale: "RPE adequado — manter carga" };
  }
  const next = Math.round((lastLoadKg * 0.93) * 2) / 2;
  return { suggestedLoadKg: next < lastLoadKg ? next : lastLoadKg - 0.5, rationale: "RPE alto na última vez — considere reduzir a carga" };
}

/** Carrega os blocos/exercícios de UMA ficha específica, com sugestão de carga baseada no histórico do aluno. Compartilhado entre "treino de hoje" e a visão completa de uma ficha. */
async function loadPlanBlocks(studentId: string, planId: string) {
  const blocks = await db
    .select()
    .from(workoutBlocks)
    .where(eq(workoutBlocks.planId, planId))
    .orderBy(asc(workoutBlocks.orderIndex));

  if (blocks.length === 0) return [];

  // Busca a execução mais recente de cada exercício prescrito (histórico do
  // aluno, não só desse ciclo) pra basear a sugestão de carga.
  const history = await db
    .select({
      blockExerciseId: workoutLogExercises.blockExerciseId,
      loadKg: workoutLogExercises.loadKg,
      difficultyRpe: workoutLogExercises.difficultyRpe,
      hadPain: workoutLogExercises.hadPain,
      performedAt: workoutLogs.performedAt,
    })
    .from(workoutLogExercises)
    .innerJoin(workoutLogs, eq(workoutLogs.id, workoutLogExercises.workoutLogId))
    .where(eq(workoutLogs.studentId, studentId))
    .orderBy(desc(workoutLogs.performedAt));

  const lastByExercise = new Map<string, (typeof history)[number]>();
  for (const row of history) {
    if (!row.blockExerciseId) continue;
    if (!lastByExercise.has(row.blockExerciseId)) {
      lastByExercise.set(row.blockExerciseId, row);
    }
  }

  const blocksWithExercises = [];
  for (const block of blocks) {
    const items = await db
      .select({
        id: workoutBlockExercises.id,
        reps: workoutBlockExercises.reps,
        loadKg: workoutBlockExercises.loadKg,
        holdSeconds: workoutBlockExercises.holdSeconds,
        setsDetail: workoutBlockExercises.setsDetail,
        exerciseId: exercises.id,
        exerciseName: exercises.name,
        videoUrl: exercises.videoUrl,
        imageUrl: exercises.imageUrl,
        muscleGroup: exercises.muscleGroup,
        muscleGroupDetail: exercises.muscleGroupDetail,
        secondaryMuscles: exercises.secondaryMuscles,
        equipment: exercises.equipment,
        instructions: exercises.instructions,
      })
      .from(workoutBlockExercises)
      .innerJoin(exercises, eq(exercises.id, workoutBlockExercises.exerciseId))
      .where(eq(workoutBlockExercises.blockId, block.id))
      .orderBy(asc(workoutBlockExercises.orderIndex));

    // Exercícios substitutos cadastrados pelo personal (mesmos músculos) —
    // buscados de uma vez pra todos os exercícios do bloco, evitando N+1.
    const exerciseIds = [...new Set(items.map((i) => i.exerciseId))];
    const substitutesByExercise = await loadSubstitutesFor(exerciseIds);

    const itemsWithSuggestion = items.map((item) => {
      const last = lastByExercise.get(item.id);
      const lastLoadKg = last?.loadKg != null ? Number(last.loadKg) : null;
      const { suggestedLoadKg, rationale } = suggestNextLoad(
        lastLoadKg,
        last?.difficultyRpe ?? null,
        last?.hadPain ?? false
      );
      return {
        ...item,
        lastLoadKg,
        lastRpe: last?.difficultyRpe ?? null,
        suggestedLoadKg,
        loadSuggestionRationale: rationale,
        substitutes: substitutesByExercise.get(item.exerciseId) ?? [],
      };
    });

    blocksWithExercises.push({ ...block, items: itemsWithSuggestion });
  }

  return blocksWithExercises;
}

/**
 * Busca, pra uma lista de exercícios prescritos, os respectivos exercícios
 * substitutos cadastrados na biblioteca (nome/mídia/grupo muscular) — usado
 * pra o aluno ver uma alternativa quando não pode fazer o exercício original.
 */
async function loadSubstitutesFor(exerciseIds: string[]) {
  const map = new Map<string, Array<{
    id: string;
    exerciseName: string;
    imageUrl: string | null;
    videoUrl: string | null;
    muscleGroup: string;
    muscleGroupDetail: string | null;
    equipment: string | null;
  }>>();
  if (exerciseIds.length === 0) return map;

  const rows = await db
    .select({
      exerciseId: exerciseSubstitutes.exerciseId,
      id: exercises.id,
      exerciseName: exercises.name,
      imageUrl: exercises.imageUrl,
      videoUrl: exercises.videoUrl,
      muscleGroup: exercises.muscleGroup,
      muscleGroupDetail: exercises.muscleGroupDetail,
      equipment: exercises.equipment,
    })
    .from(exerciseSubstitutes)
    .innerJoin(exercises, eq(exercises.id, exerciseSubstitutes.substituteExerciseId))
    .where(inArray(exerciseSubstitutes.exerciseId, exerciseIds));

  for (const row of rows) {
    const { exerciseId, ...substitute } = row;
    if (!map.has(exerciseId)) map.set(exerciseId, []);
    map.get(exerciseId)!.push(substitute);
  }
  return map;
}

export async function getTodayWorkout() {
  const student = await requireStudent();
  const todayCode = WEEKDAY_CODES[new Date().getDay()];

  const [cycle] = await db
    .select()
    .from(workoutCycles)
    .where(and(eq(workoutCycles.studentId, student.id), eq(workoutCycles.isActive, true)))
    .orderBy(desc(workoutCycles.startDate))
    .limit(1);

  if (!cycle) return { cycle: null, plan: null, blocks: [] };

  const plans = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.cycleId, cycle.id), like(workoutPlans.weekdays, `%${todayCode}%`)));

  const plan = plans[0] ?? null;
  if (!plan) return { cycle, plan: null, blocks: [] };

  const blocks = await loadPlanBlocks(student.id, plan.id);
  return { cycle, plan, blocks };
}

/** Ciclo ativo do aluno + todas as fichas dele (não só a de hoje) — usada na tela "Meus treinos". */
export async function listMyWorkoutPlans() {
  const student = await requireStudent();

  const [cycle] = await db
    .select()
    .from(workoutCycles)
    .where(and(eq(workoutCycles.studentId, student.id), eq(workoutCycles.isActive, true)))
    .orderBy(desc(workoutCycles.startDate))
    .limit(1);

  if (!cycle) return { cycle: null, plans: [] };

  const plans = await db
    .select({
      id: workoutPlans.id,
      label: workoutPlans.label,
      weekdays: workoutPlans.weekdays,
      orderIndex: workoutPlans.orderIndex,
      exerciseCount: sql<number>`count(distinct ${workoutBlockExercises.id})`.mapWith(Number),
    })
    .from(workoutPlans)
    .leftJoin(workoutBlocks, eq(workoutBlocks.planId, workoutPlans.id))
    .leftJoin(workoutBlockExercises, eq(workoutBlockExercises.blockId, workoutBlocks.id))
    .where(eq(workoutPlans.cycleId, cycle.id))
    .groupBy(workoutPlans.id)
    .orderBy(asc(workoutPlans.orderIndex));

  return { cycle, plans };
}

/** Detalhe completo de UMA ficha (qualquer dia do ciclo, não só hoje) — usada ao abrir uma ficha em "Meus treinos". */
export async function getWorkoutPlanDetail(planId: string) {
  const student = await requireStudent();

  const [row] = await db
    .select({ plan: workoutPlans, studentId: workoutCycles.studentId })
    .from(workoutPlans)
    .innerJoin(workoutCycles, eq(workoutCycles.id, workoutPlans.cycleId))
    .where(eq(workoutPlans.id, planId))
    .limit(1);

  if (!row || row.studentId !== student.id) throw new Error("Ficha não encontrada.");

  const blocks = await loadPlanBlocks(student.id, planId);
  return { plan: row.plan, blocks };
}

export async function logWorkoutCompletion(planId: string, overallFeeling: string, notes: string) {
  const student = await requireStudent();

  const [log] = await db
    .insert(workoutLogs)
    .values({ studentId: student.id, planId, overallFeeling, notes })
    .returning();

  revalidatePath("/portal");
  return { success: true, logId: log.id };
}

export async function logExerciseFeedback(
  workoutLogId: string,
  blockExerciseId: string,
  data: { loadKg?: string; setsCompleted?: number; repsCompleted?: string; difficultyRpe?: number; hadPain?: boolean; painDetail?: string }
) {
  await requireStudent();

  await db.insert(workoutLogExercises).values({
    workoutLogId,
    blockExerciseId,
    loadKg: data.loadKg,
    setsCompleted: data.setsCompleted,
    repsCompleted: data.repsCompleted,
    difficultyRpe: data.difficultyRpe,
    hadPain: data.hadPain ?? false,
    painDetail: data.painDetail,
  });

  return { success: true };
}
