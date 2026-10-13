"use server";

import { db } from "@/db";
import {
  students, workoutCycles, workoutPlans, workoutBlocks, workoutBlockExercises, exercises,
  workoutLogs, workoutLogExercises,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SERIES_TYPES, SERIES_TYPE_EXERCISE_COUNT, type SeriesType } from "@/lib/constants";

async function requireTrainerForStudent(studentId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.trainerId, session.user.id)))
    .limit(1);

  if (!student) throw new Error("Aluno não encontrado");
  return { trainerId: session.user.id, student };
}

// ---------- Ciclos ----------

const cycleSchema = z.object({
  name: z.string().min(2, "Informe o nome do ciclo"),
  goal: z.string().optional(),
  startDate: z.string().min(1, "Informe a data de início"),
  endDate: z.string().optional(),
});

export async function listCycles(studentId: string) {
  await requireTrainerForStudent(studentId);
  return db
    .select()
    .from(workoutCycles)
    .where(eq(workoutCycles.studentId, studentId))
    .orderBy(desc(workoutCycles.startDate));
}

export async function createCycle(studentId: string, formData: FormData) {
  await requireTrainerForStudent(studentId);

  const parsed = cycleSchema.safeParse({
    name: formData.get("name"),
    goal: formData.get("goal") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // desativa ciclos anteriores — só um ciclo ativo por vez alimenta o "treino de hoje" do aluno
  await db.update(workoutCycles).set({ isActive: false }).where(eq(workoutCycles.studentId, studentId));

  await db.insert(workoutCycles).values({
    studentId,
    name: parsed.data.name,
    goal: parsed.data.goal,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate || null,
    isActive: true,
  });

  revalidatePath(`/dashboard/students/${studentId}/workouts`);
  return { success: true };
}

export async function deleteCycle(studentId: string, cycleId: string) {
  await requireTrainerForStudent(studentId);
  await db.delete(workoutCycles).where(and(eq(workoutCycles.id, cycleId), eq(workoutCycles.studentId, studentId)));
  revalidatePath(`/dashboard/students/${studentId}/workouts`);
}

export async function setActiveCycle(studentId: string, cycleId: string) {
  await requireTrainerForStudent(studentId);
  await db.update(workoutCycles).set({ isActive: false }).where(eq(workoutCycles.studentId, studentId));
  await db.update(workoutCycles).set({ isActive: true }).where(eq(workoutCycles.id, cycleId));
  revalidatePath(`/dashboard/students/${studentId}/workouts`);
}

// ---------- Fichas (planos) ----------

const planSchema = z.object({
  label: z.string().min(1, "Informe um nome, ex: Treino A"),
  weekdays: z.array(z.string()).default([]),
});

export async function listPlansWithExercises(cycleId: string) {
  const plans = await db.select().from(workoutPlans).where(eq(workoutPlans.cycleId, cycleId)).orderBy(asc(workoutPlans.orderIndex));
  if (plans.length === 0) return [];

  // Consultas em lote (uma para blocos e uma para exercícios de todos os blocos do ciclo),
  // em vez de uma consulta por ficha e por bloco.
  const blocks = await db
    .select()
    .from(workoutBlocks)
    .where(inArray(workoutBlocks.planId, plans.map((p) => p.id)))
    .orderBy(asc(workoutBlocks.orderIndex));

  const blockExercises = blocks.length === 0 ? [] : await db
    .select({
      blockId: workoutBlockExercises.blockId,
      id: workoutBlockExercises.id,
      orderIndex: workoutBlockExercises.orderIndex,
      reps: workoutBlockExercises.reps,
      loadKg: workoutBlockExercises.loadKg,
      tempo: workoutBlockExercises.tempo,
      holdSeconds: workoutBlockExercises.holdSeconds,
      notes: workoutBlockExercises.notes,
      setsDetail: workoutBlockExercises.setsDetail,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      muscleGroupDetail: exercises.muscleGroupDetail,
      imageUrl: exercises.imageUrl,
      videoUrl: exercises.videoUrl,
    })
    .from(workoutBlockExercises)
    .innerJoin(exercises, eq(exercises.id, workoutBlockExercises.exerciseId))
    .where(inArray(workoutBlockExercises.blockId, blocks.map((b) => b.id)))
    .orderBy(asc(workoutBlockExercises.orderIndex));

  const exercisesByBlock = new Map<string, Array<Omit<(typeof blockExercises)[number], "blockId">>>();
  for (const { blockId, ...item } of blockExercises) {
    if (!exercisesByBlock.has(blockId)) exercisesByBlock.set(blockId, []);
    exercisesByBlock.get(blockId)!.push(item);
  }

  const blocksByPlan = new Map<string, Array<(typeof blocks)[number] & { exercises: Array<Omit<(typeof blockExercises)[number], "blockId">> }>>();
  for (const block of blocks) {
    if (!blocksByPlan.has(block.planId)) blocksByPlan.set(block.planId, []);
    blocksByPlan.get(block.planId)!.push({ ...block, exercises: exercisesByBlock.get(block.id) ?? [] });
  }

  return plans.map((plan) => ({ ...plan, blocks: blocksByPlan.get(plan.id) ?? [] }));
}

export async function createPlan(studentId: string, cycleId: string, formData: FormData) {
  await requireTrainerForStudent(studentId);

  const parsed = planSchema.safeParse({
    label: formData.get("label"),
    weekdays: formData.getAll("weekdays").filter(Boolean) as string[],
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(workoutPlans).values({
    cycleId,
    label: parsed.data.label,
    weekdays: parsed.data.weekdays.join(","),
  });

  revalidatePath(`/dashboard/students/${studentId}/workouts`);
  return { success: true };
}

export async function deletePlan(studentId: string, planId: string) {
  await requireTrainerForStudent(studentId);
  await db.delete(workoutPlans).where(eq(workoutPlans.id, planId));
  revalidatePath(`/dashboard/students/${studentId}/workouts`);
}

// ---------- Blocos (série simples / bi-set / tri-set / etc) dentro de uma ficha ----------

const setDetailRowSchema = z.object({
  setNumber: z.number().int().min(1),
  label: z.string().optional(),
  reps: z.string().optional(),
  loadKg: z.number().optional(),
  restSeconds: z.number().int().optional(),
  holdSeconds: z.number().int().optional(),
});

const blockExerciseInputSchema = z.object({
  exerciseId: z.string().min(1, "Selecione um exercício"),
  reps: z.string().optional(),
  loadKg: z.number().optional(),
  tempo: z.string().optional(),
  holdSeconds: z.number().int().optional(),
  notes: z.string().optional(),
  setsDetail: z.array(setDetailRowSchema).optional(),
});

const createBlockSchema = z.object({
  seriesType: z.enum(SERIES_TYPES as unknown as [SeriesType, ...SeriesType[]]),
  rounds: z.number().int().min(1),
  restSeconds: z.number().int().optional(),
  notes: z.string().optional(),
  exercises: z.array(blockExerciseInputSchema).min(1),
});

export type CreateBlockInput = z.infer<typeof createBlockSchema>;

/**
 * Cria um bloco completo (série simples, bi-set, tri-set, circuito, pirâmide,
 * drop-set, etc) com todos os exercícios que ele contém numa única chamada —
 * mais simples do que compor várias server actions encadeadas do client.
 */
export async function createBlockWithExercises(studentId: string, planId: string, input: CreateBlockInput) {
  await requireTrainerForStudent(studentId);

  const parsed = createBlockSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { min, max } = SERIES_TYPE_EXERCISE_COUNT[parsed.data.seriesType];
  if (parsed.data.exercises.length < min || parsed.data.exercises.length > max) {
    return { error: `Esse tipo de série exige entre ${min} e ${max} exercício(s).` };
  }

  const existingCount = await db.select().from(workoutBlocks).where(eq(workoutBlocks.planId, planId));

  const [block] = await db
    .insert(workoutBlocks)
    .values({
      planId,
      orderIndex: existingCount.length,
      seriesType: parsed.data.seriesType,
      rounds: parsed.data.rounds,
      restSeconds: parsed.data.restSeconds,
      notes: parsed.data.notes,
    })
    .returning();

  await db.insert(workoutBlockExercises).values(
    parsed.data.exercises.map((ex, i) => ({
      blockId: block.id,
      exerciseId: ex.exerciseId,
      orderIndex: i,
      reps: ex.reps,
      loadKg: ex.loadKg != null ? String(ex.loadKg) : undefined,
      tempo: ex.tempo,
      holdSeconds: ex.holdSeconds,
      notes: ex.notes,
      setsDetail: ex.setsDetail && ex.setsDetail.length > 0 ? ex.setsDetail : undefined,
    }))
  );

  revalidatePath(`/dashboard/students/${studentId}/workouts`);
  return { success: true, blockId: block.id };
}

export async function updateBlock(
  studentId: string,
  blockId: string,
  data: { rounds?: number; restSeconds?: number; notes?: string }
) {
  await requireTrainerForStudent(studentId);
  await db.update(workoutBlocks).set(data).where(eq(workoutBlocks.id, blockId));
  revalidatePath(`/dashboard/students/${studentId}/workouts`);
  return { success: true };
}

export async function deleteBlock(studentId: string, blockId: string) {
  await requireTrainerForStudent(studentId);
  await db.delete(workoutBlocks).where(eq(workoutBlocks.id, blockId));
  revalidatePath(`/dashboard/students/${studentId}/workouts`);
}

export async function removeBlockExercise(studentId: string, blockExerciseId: string) {
  await requireTrainerForStudent(studentId);
  await db.delete(workoutBlockExercises).where(eq(workoutBlockExercises.id, blockExerciseId));
  revalidatePath(`/dashboard/students/${studentId}/workouts`);
}

export async function reorderBlocks(studentId: string, blockIds: string[]) {
  await requireTrainerForStudent(studentId);
  await Promise.all(blockIds.map((id, orderIndex) => db.update(workoutBlocks).set({ orderIndex }).where(eq(workoutBlocks.id, id))));
  revalidatePath(`/dashboard/students/${studentId}/workouts`);
}

// ---------- Histórico de execução (o que o aluno realmente fez) ----------

export async function listWorkoutLogs(studentId: string, limit = 30) {
  await requireTrainerForStudent(studentId);

  const logs = await db
    .select({
      id: workoutLogs.id,
      performedAt: workoutLogs.performedAt,
      durationMinutes: workoutLogs.durationMinutes,
      overallFeeling: workoutLogs.overallFeeling,
      notes: workoutLogs.notes,
      planLabel: workoutPlans.label,
    })
    .from(workoutLogs)
    .leftJoin(workoutPlans, eq(workoutPlans.id, workoutLogs.planId))
    .where(eq(workoutLogs.studentId, studentId))
    .orderBy(desc(workoutLogs.performedAt))
    .limit(limit);

  if (logs.length === 0) return [];

  const logIds = logs.map((l) => l.id);
  const feedbackRows = await db
    .select({
      workoutLogId: workoutLogExercises.workoutLogId,
      setsCompleted: workoutLogExercises.setsCompleted,
      repsCompleted: workoutLogExercises.repsCompleted,
      loadKg: workoutLogExercises.loadKg,
      difficultyRpe: workoutLogExercises.difficultyRpe,
      hadPain: workoutLogExercises.hadPain,
      painDetail: workoutLogExercises.painDetail,
      skipped: workoutLogExercises.skipped,
      exerciseName: exercises.name,
      orderIndex: workoutBlockExercises.orderIndex,
    })
    .from(workoutLogExercises)
    .leftJoin(workoutBlockExercises, eq(workoutBlockExercises.id, workoutLogExercises.blockExerciseId))
    .leftJoin(exercises, eq(exercises.id, workoutBlockExercises.exerciseId))
    .where(inArray(workoutLogExercises.workoutLogId, logIds))
    .orderBy(asc(workoutBlockExercises.orderIndex));

  return logs.map((log) => ({
    ...log,
    exercises: feedbackRows.filter((row) => row.workoutLogId === log.id),
  }));
}
