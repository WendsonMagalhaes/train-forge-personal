"use server";

import { db } from "@/db";
import {
  students, workoutCycles, workoutPlans, workoutBlocks, workoutBlockExercises, exercises,
  workoutTemplates, workoutTemplateBlocks, workoutTemplateExercises,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc, inArray, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SERIES_TYPES, SERIES_TYPE_EXERCISE_COUNT, type SeriesType } from "@/lib/constants";
import { toDbText, toDbTextOrNull } from "@/lib/text-case";
import { optionalDecimal, optionalInt, requiredInt } from "@/lib/validations/numeric";
import type { CreateBlockInput } from "./workouts";

/** Lê os grupos musculares do formulário (já convertidos para rótulos), sem vazios nem repetidos. */
function readMuscles(formData: FormData): string[] {
  const values = formData.getAll("muscles").map((v) => String(v).trim()).filter(Boolean);
  return [...new Set(values)];
}

const TEMPLATES_PATH = "/dashboard/treinos-prontos";

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");
  return session.user.id;
}

async function requireTemplateOwned(trainerId: string, templateId: string) {
  const [row] = await db
    .select({ id: workoutTemplates.id })
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.trainerId, trainerId)))
    .limit(1);
  if (!row) throw new Error("Modelo não encontrado");
}

async function requireStudentOwned(trainerId: string, studentId: string) {
  const [row] = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainerId)))
    .limit(1);
  if (!row) throw new Error("Aluno não encontrado");
}

async function requirePlanOwned(studentId: string, planId: string) {
  const [row] = await db
    .select({ id: workoutPlans.id })
    .from(workoutPlans)
    .innerJoin(workoutCycles, eq(workoutCycles.id, workoutPlans.cycleId))
    .where(and(eq(workoutPlans.id, planId), eq(workoutCycles.studentId, studentId)))
    .limit(1);
  if (!row) throw new Error("Ficha não encontrada");
}

// ---------- Leitura ----------

type TemplateExerciseRow = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  orderIndex: number | null;
  reps: string | null;
  loadKg: string | null;
  tempo: string | null;
  holdSeconds: number | null;
  notes: string | null;
  setsDetail: Array<{
    setNumber: number; label?: string; reps?: string; loadKg?: number; restSeconds?: number; holdSeconds?: number;
  }> | null;
};

export type WorkoutTemplateItem = {
  id: string;
  name: string;
  muscles: string[] | null;
  notes: string | null;
  blocks: Array<{
    id: string;
    seriesType: SeriesType;
    rounds: number;
    restSeconds: number | null;
    notes: string | null;
    exercises: TemplateExerciseRow[];
  }>;
};

/** Modelos do personal logado, com blocos e exercícios (consultas em lote). */
export async function listWorkoutTemplates(): Promise<WorkoutTemplateItem[]> {
  const trainerId = await requireTrainer();

  const templates = await db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.trainerId, trainerId))
    .orderBy(asc(workoutTemplates.name));
  if (templates.length === 0) return [];

  const blocks = await db
    .select()
    .from(workoutTemplateBlocks)
    .where(inArray(workoutTemplateBlocks.templateId, templates.map((t) => t.id)))
    .orderBy(asc(workoutTemplateBlocks.orderIndex));

  const blockExercises = blocks.length === 0 ? [] : await db
    .select({
      id: workoutTemplateExercises.id,
      templateBlockId: workoutTemplateExercises.templateBlockId,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      orderIndex: workoutTemplateExercises.orderIndex,
      reps: workoutTemplateExercises.reps,
      loadKg: workoutTemplateExercises.loadKg,
      tempo: workoutTemplateExercises.tempo,
      holdSeconds: workoutTemplateExercises.holdSeconds,
      notes: workoutTemplateExercises.notes,
      setsDetail: workoutTemplateExercises.setsDetail,
    })
    .from(workoutTemplateExercises)
    .innerJoin(exercises, eq(exercises.id, workoutTemplateExercises.exerciseId))
    .where(inArray(workoutTemplateExercises.templateBlockId, blocks.map((b) => b.id)))
    .orderBy(asc(workoutTemplateExercises.orderIndex));

  const exercisesByBlock = new Map<string, TemplateExerciseRow[]>();
  for (const { templateBlockId, ...item } of blockExercises) {
    if (!exercisesByBlock.has(templateBlockId)) exercisesByBlock.set(templateBlockId, []);
    exercisesByBlock.get(templateBlockId)!.push(item);
  }

  const blocksByTemplate = new Map<string, WorkoutTemplateItem["blocks"]>();
  for (const block of blocks) {
    if (!blocksByTemplate.has(block.templateId)) blocksByTemplate.set(block.templateId, []);
    blocksByTemplate.get(block.templateId)!.push({
      id: block.id,
      seriesType: block.seriesType,
      rounds: block.rounds,
      restSeconds: block.restSeconds,
      notes: block.notes,
      exercises: exercisesByBlock.get(block.id) ?? [],
    });
  }

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    muscles: t.muscles,
    notes: t.notes,
    blocks: blocksByTemplate.get(t.id) ?? [],
  }));
}

// ---------- Modelos: criar, editar, excluir ----------

const templateInfoSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome, ex: Tríceps"),
  notes: z.string().optional(),
  muscles: z.array(z.string()).default([]),
});

export async function createWorkoutTemplate(formData: FormData) {
  const trainerId = await requireTrainer();

  const parsed = templateInfoSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
    muscles: readMuscles(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [created] = await db
    .insert(workoutTemplates)
    .values({
      trainerId,
      name: toDbText(parsed.data.name),
      muscles: parsed.data.muscles,
      notes: toDbTextOrNull(parsed.data.notes),
    })
    .returning({ id: workoutTemplates.id });

  revalidatePath(TEMPLATES_PATH);
  return { success: true, id: created.id };
}

export async function updateWorkoutTemplate(templateId: string, formData: FormData) {
  const trainerId = await requireTrainer();
  await requireTemplateOwned(trainerId, templateId);

  const parsed = templateInfoSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
    muscles: readMuscles(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(workoutTemplates)
    .set({
      name: toDbText(parsed.data.name),
      muscles: parsed.data.muscles,
      notes: toDbTextOrNull(parsed.data.notes),
    })
    .where(eq(workoutTemplates.id, templateId));

  revalidatePath(TEMPLATES_PATH);
  return { success: true };
}

export async function deleteWorkoutTemplate(templateId: string) {
  const trainerId = await requireTrainer();
  await requireTemplateOwned(trainerId, templateId);
  // Blocos aplicados a fichas são cópias, então excluir o modelo não afeta alunos.
  await db.delete(workoutTemplates).where(eq(workoutTemplates.id, templateId));
  revalidatePath(TEMPLATES_PATH);
}

// ---------- Blocos dentro do modelo ----------

const templateExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Selecione um exercício"),
  reps: z.string().optional(),
  loadKg: optionalDecimal,
  tempo: z.string().optional(),
  holdSeconds: optionalInt,
  notes: z.string().optional(),
});

const templateBlockSchema = z.object({
  seriesType: z.enum(SERIES_TYPES as unknown as [SeriesType, ...SeriesType[]]),
  rounds: requiredInt("Informe um número válido de séries."),
  restSeconds: optionalInt,
  notes: z.string().optional(),
  exercises: z.array(templateExerciseSchema).min(1, "Adicione pelo menos um exercício."),
});

/**
 * Adiciona blocos ao modelo. Valida todos antes de gravar, então um erro em
 * qualquer item não deixa blocos pela metade.
 */
export async function addBlocksToWorkoutTemplate(templateId: string, inputs: CreateBlockInput[]) {
  const trainerId = await requireTrainer();
  await requireTemplateOwned(trainerId, templateId);

  const blocks: z.output<typeof templateBlockSchema>[] = [];
  for (const input of inputs) {
    const parsed = templateBlockSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { min, max } = SERIES_TYPE_EXERCISE_COUNT[parsed.data.seriesType];
    if (parsed.data.exercises.length < min || parsed.data.exercises.length > max) {
      return { error: `Esse tipo de série exige entre ${min} e ${max} exercício(s).` };
    }
    blocks.push(parsed.data);
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(workoutTemplateBlocks)
    .where(eq(workoutTemplateBlocks.templateId, templateId));
  let orderIndex = Number(total);

  for (const data of blocks) {
    const [block] = await db
      .insert(workoutTemplateBlocks)
      .values({
        templateId,
        orderIndex: orderIndex++,
        seriesType: data.seriesType,
        rounds: data.rounds,
        restSeconds: data.restSeconds,
        notes: toDbTextOrNull(data.notes),
      })
      .returning();

    await db.insert(workoutTemplateExercises).values(
      data.exercises.map((ex, i) => ({
        templateBlockId: block.id,
        exerciseId: ex.exerciseId,
        orderIndex: i,
        reps: ex.reps || undefined,
        loadKg: ex.loadKg != null ? String(ex.loadKg) : undefined,
        tempo: ex.tempo || undefined,
        holdSeconds: ex.holdSeconds,
        notes: toDbTextOrNull(ex.notes),
      }))
    );
  }

  revalidatePath(TEMPLATES_PATH);
  return { success: true };
}

export async function deleteWorkoutTemplateBlock(templateId: string, blockId: string) {
  const trainerId = await requireTrainer();
  await requireTemplateOwned(trainerId, templateId);
  await db
    .delete(workoutTemplateBlocks)
    .where(and(eq(workoutTemplateBlocks.id, blockId), eq(workoutTemplateBlocks.templateId, templateId)));
  revalidatePath(TEMPLATES_PATH);
}

// ---------- Ponte com as fichas dos alunos ----------

/**
 * Cria um modelo copiando os blocos de uma ficha existente do aluno
 * (inclui métodos avançados e setsDetail). A ficha do aluno não é alterada.
 */
export async function savePlanAsTemplate(studentId: string, planId: string, formData: FormData) {
  const trainerId = await requireTrainer();
  await requireStudentOwned(trainerId, studentId);
  await requirePlanOwned(studentId, planId);

  const parsed = templateInfoSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes") || undefined,
    muscles: readMuscles(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const planBlocks = await db
    .select()
    .from(workoutBlocks)
    .where(eq(workoutBlocks.planId, planId))
    .orderBy(asc(workoutBlocks.orderIndex));
  if (planBlocks.length === 0) return { error: "Essa ficha ainda não tem exercícios." };

  const planExercises = await db
    .select()
    .from(workoutBlockExercises)
    .where(inArray(workoutBlockExercises.blockId, planBlocks.map((b) => b.id)))
    .orderBy(asc(workoutBlockExercises.orderIndex));

  const [template] = await db
    .insert(workoutTemplates)
    .values({
      trainerId,
      name: toDbText(parsed.data.name),
      muscles: parsed.data.muscles,
      notes: toDbTextOrNull(parsed.data.notes),
    })
    .returning({ id: workoutTemplates.id });

  for (const [index, block] of planBlocks.entries()) {
    const [newBlock] = await db
      .insert(workoutTemplateBlocks)
      .values({
        templateId: template.id,
        orderIndex: index,
        seriesType: block.seriesType,
        rounds: block.rounds,
        restSeconds: block.restSeconds,
        notes: block.notes,
      })
      .returning({ id: workoutTemplateBlocks.id });

    const items = planExercises.filter((ex) => ex.blockId === block.id);
    if (items.length > 0) {
      await db.insert(workoutTemplateExercises).values(
        items.map((ex) => ({
          templateBlockId: newBlock.id,
          exerciseId: ex.exerciseId,
          orderIndex: ex.orderIndex,
          reps: ex.reps,
          loadKg: ex.loadKg,
          tempo: ex.tempo,
          holdSeconds: ex.holdSeconds,
          notes: ex.notes,
          setsDetail: ex.setsDetail,
        }))
      );
    }
  }

  revalidatePath(TEMPLATES_PATH);
  return { success: true, id: template.id };
}

/**
 * Aplica um ou mais modelos à ficha do aluno, na ordem em que foram
 * selecionados. Os blocos são copiados: mudar o modelo depois não altera
 * a ficha do aluno.
 */
export async function applyTemplatesToPlan(studentId: string, planId: string, templateIds: string[]) {
  const trainerId = await requireTrainer();
  await requireStudentOwned(trainerId, studentId);
  await requirePlanOwned(studentId, planId);

  const uniqueIds = [...new Set(templateIds)];
  if (uniqueIds.length === 0) return { error: "Selecione pelo menos um modelo." };

  const templates = await db
    .select({ id: workoutTemplates.id })
    .from(workoutTemplates)
    .where(and(inArray(workoutTemplates.id, uniqueIds), eq(workoutTemplates.trainerId, trainerId)));
  if (templates.length !== uniqueIds.length) return { error: "Algum modelo não foi encontrado." };

  const templateBlocks = await db
    .select()
    .from(workoutTemplateBlocks)
    .where(inArray(workoutTemplateBlocks.templateId, uniqueIds))
    .orderBy(asc(workoutTemplateBlocks.orderIndex));

  const templateExercises = templateBlocks.length === 0 ? [] : await db
    .select()
    .from(workoutTemplateExercises)
    .where(inArray(workoutTemplateExercises.templateBlockId, templateBlocks.map((b) => b.id)))
    .orderBy(asc(workoutTemplateExercises.orderIndex));

  const [{ total }] = await db
    .select({ total: count() })
    .from(workoutBlocks)
    .where(eq(workoutBlocks.planId, planId));
  let orderIndex = Number(total);

  // Mantém a ordem da seleção: primeiro o modelo escolhido primeiro.
  for (const templateId of uniqueIds) {
    const blocksOfTemplate = templateBlocks.filter((b) => b.templateId === templateId);
    for (const block of blocksOfTemplate) {
      const [newBlock] = await db
        .insert(workoutBlocks)
        .values({
          planId,
          orderIndex: orderIndex++,
          seriesType: block.seriesType,
          rounds: block.rounds,
          restSeconds: block.restSeconds,
          notes: block.notes,
        })
        .returning({ id: workoutBlocks.id });

      const items = templateExercises.filter((ex) => ex.templateBlockId === block.id);
      if (items.length > 0) {
        await db.insert(workoutBlockExercises).values(
          items.map((ex) => ({
            blockId: newBlock.id,
            exerciseId: ex.exerciseId,
            orderIndex: ex.orderIndex,
            reps: ex.reps,
            loadKg: ex.loadKg,
            tempo: ex.tempo,
            holdSeconds: ex.holdSeconds,
            notes: ex.notes,
            setsDetail: ex.setsDetail,
          }))
        );
      }
    }
  }

  revalidatePath(`/dashboard/students/${studentId}/workouts`);
  return { success: true };
}
