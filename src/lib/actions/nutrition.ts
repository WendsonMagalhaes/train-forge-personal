"use server";

import { z } from "zod";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  nutritionPlans,
  nutritionLogs,
  externalNutritionists,
  students,
} from "@/db/schema";
import { auth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Helpers de autorização
// ---------------------------------------------------------------------------

async function requireTrainerForStudent(studentId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    throw new Error("Não autorizado.");
  }

  const [student] = await db
    .select({ id: students.id, trainerId: students.trainerId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student || student.trainerId !== session.user.id) {
    throw new Error("Aluno não encontrado ou não pertence a este personal.");
  }

  return { session, student };
}

async function requireCurrentStudent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") {
    throw new Error("Não autorizado.");
  }

  const [student] = await db
    .select({ id: students.id, trainerId: students.trainerId })
    .from(students)
    .where(eq(students.userId, session.user.id))
    .limit(1);

  if (!student) {
    throw new Error("Cadastro de aluno não encontrado.");
  }

  return { session, student };
}

// ---------------------------------------------------------------------------
// Plano nutricional (personal cria/gerencia; aluno só visualiza)
// ---------------------------------------------------------------------------

const nutritionPlanSchema = z.object({
  studentId: z.string().uuid(),
  title: z.string().min(1, "Título obrigatório"),
  targetCalories: z.coerce.number().positive().optional().or(z.literal("")),
  targetProteinG: z.coerce.number().positive().optional().or(z.literal("")),
  targetCarbsG: z.coerce.number().positive().optional().or(z.literal("")),
  targetFatG: z.coerce.number().positive().optional().or(z.literal("")),
  guidelines: z.string().optional(),
  validFrom: z.string().min(1), // yyyy-mm-dd
});

export type NutritionPlanInput = {
  studentId: string;
  title: string;
  targetCalories?: string;
  targetProteinG?: string;
  targetCarbsG?: string;
  targetFatG?: string;
  guidelines?: string;
  validFrom: string;
};
/**
 * Cria um novo plano nutricional para o aluno e encerra automaticamente
 * (validTo = dia anterior) qualquer plano ainda vigente, mantendo o
 * histórico completo de versões — mesmo padrão usado em avaliações físicas.
 */
export async function createNutritionPlan(input: NutritionPlanInput) {
  const parsed = nutritionPlanSchema.parse(input);
  const { session } = await requireTrainerForStudent(parsed.studentId);

  const validFrom = parsed.validFrom;

  await db.transaction(async (tx) => {
    // encerra o plano vigente (se houver) um dia antes do novo começar
    await tx
      .update(nutritionPlans)
      .set({ validTo: validFrom })
      .where(
        and(
          eq(nutritionPlans.studentId, parsed.studentId),
          or(isNull(nutritionPlans.validTo), gte(nutritionPlans.validTo, validFrom))
        )
      );

    await tx.insert(nutritionPlans).values({
      studentId: parsed.studentId,
      createdById: session.user.id,
      title: parsed.title,
      targetCalories: emptyToNull(parsed.targetCalories),
      targetProteinG: emptyToNull(parsed.targetProteinG),
      targetCarbsG: emptyToNull(parsed.targetCarbsG),
      targetFatG: emptyToNull(parsed.targetFatG),
      guidelines: parsed.guidelines || null,
      validFrom,
    });
  });

  revalidatePath(`/dashboard/students/${parsed.studentId}/nutrition`);
  revalidatePath(`/portal/nutrition`);
}

function emptyToNull(v: number | "" | undefined) {
  return v === "" || v === undefined ? null : String(v);
}

/** Plano vigente hoje para um aluno (usado no painel do personal). */
export async function getActiveNutritionPlan(studentId: string) {
  await requireTrainerForStudent(studentId);
  return fetchActivePlan(studentId);
}

/** Plano vigente do próprio aluno logado (usado no portal). */
export async function getMyActiveNutritionPlan() {
  const { student } = await requireCurrentStudent();
  return fetchActivePlan(student.id);
}

async function fetchActivePlan(studentId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [plan] = await db
    .select()
    .from(nutritionPlans)
    .where(
      and(
        eq(nutritionPlans.studentId, studentId),
        lte(nutritionPlans.validFrom, today),
        or(isNull(nutritionPlans.validTo), gte(nutritionPlans.validTo, today))
      )
    )
    .orderBy(desc(nutritionPlans.validFrom))
    .limit(1);
  return plan ?? null;
}

/** Histórico completo de planos do aluno (mais recente primeiro). */
export async function listNutritionPlans(studentId: string) {
  await requireTrainerForStudent(studentId);
  return db
    .select()
    .from(nutritionPlans)
    .where(eq(nutritionPlans.studentId, studentId))
    .orderBy(desc(nutritionPlans.validFrom));
}

// ---------------------------------------------------------------------------
// Nutricionistas parceiros (cadastro simples, por personal)
// ---------------------------------------------------------------------------

const externalNutritionistSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  crn: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export async function createExternalNutritionist(
  input: z.infer<typeof externalNutritionistSchema>
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    throw new Error("Não autorizado.");
  }
  const parsed = externalNutritionistSchema.parse(input);

  await db.insert(externalNutritionists).values({
    trainerId: session.user.id,
    name: parsed.name,
    crn: parsed.crn || null,
    email: parsed.email || null,
    phone: parsed.phone || null,
  });

  revalidatePath("/dashboard/nutrition-partners");
}

export async function listExternalNutritionists() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    throw new Error("Não autorizado.");
  }
  return db
    .select()
    .from(externalNutritionists)
    .where(eq(externalNutritionists.trainerId, session.user.id))
    .orderBy(externalNutritionists.name);
}

// ---------------------------------------------------------------------------
// Diário alimentar (aluno registra, personal acompanha)
// ---------------------------------------------------------------------------

const nutritionLogSchema = z.object({
  meal: z.string().optional(),
  description: z.string().min(1, "Descreva o que você comeu"),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export type NutritionLogInput = z.infer<typeof nutritionLogSchema>;

export async function createNutritionLog(input: NutritionLogInput) {
  const { student } = await requireCurrentStudent();
  const parsed = nutritionLogSchema.parse(input);

  await db.insert(nutritionLogs).values({
    studentId: student.id,
    meal: parsed.meal || null,
    description: parsed.description,
    photoUrl: parsed.photoUrl || null,
  });

  revalidatePath("/portal/nutrition");
  revalidatePath(`/dashboard/students/${student.id}/nutrition`);
}

/** Últimos registros do diário — usado tanto no portal quanto no painel do personal. */
export async function listNutritionLogs(studentId: string, limit = 20) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado.");

  if (session.user.role === "trainer") {
    await requireTrainerForStudent(studentId);
  } else if (session.user.role === "student") {
    const { student } = await requireCurrentStudent();
    if (student.id !== studentId) throw new Error("Não autorizado.");
  } else {
    throw new Error("Não autorizado.");
  }

  return db
    .select()
    .from(nutritionLogs)
    .where(eq(nutritionLogs.studentId, studentId))
    .orderBy(desc(nutritionLogs.loggedAt))
    .limit(limit);
}

/** Atalho para a própria página do portal buscar studentId + logs de uma vez. */
export async function listMyNutritionLogs(limit = 20) {
  const { student } = await requireCurrentStudent();
  return db
    .select()
    .from(nutritionLogs)
    .where(eq(nutritionLogs.studentId, student.id))
    .orderBy(desc(nutritionLogs.loggedAt))
    .limit(limit);
}
