"use server";

import { db } from "@/db";
import {
  users, students, exercises,
  plans, subscriptions, payments,
  sessions,
  workoutCycles,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/constants";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Não autorizado");
  }
  return session.user;
}

function generateTempPassword() {
  return randomBytes(6).toString("hex");
}

/* ------------------------------------------------------------------ */
/* Usuários                                                            */
/* ------------------------------------------------------------------ */

const userSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "trainer", "student"]),
  trainerId: z.string().optional(), // obrigatório quando role === "student"
});

export async function listAllUsers() {
  await requireAdmin();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      trainerId: users.trainerId,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

/** Personais disponíveis pra vincular um aluno (usado no seletor do formulário). */
export async function listTrainersForPicker() {
  await requireAdmin();
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.role, "trainer"))
    .orderBy(users.name);
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    trainerId: formData.get("trainerId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, role, trainerId } = parsed.data;

  if (role === "student" && !trainerId) {
    return { error: "Selecione o personal responsável pelo aluno." };
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return { error: "Já existe um usuário com esse e-mail." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role,
      trainerId: role === "student" ? trainerId : null,
      mustChangePassword: true,
    })
    .returning();

  // Mantém consistência com o resto do sistema: todo usuário "student" tem uma linha em `students`.
  if (role === "student") {
    await db.insert(students).values({ userId: newUser.id, trainerId: trainerId! });
  }

  revalidatePath("/admin/users");
  return { success: true, credentials: { email, tempPassword } };
}

const updateUserSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(["admin", "trainer", "student"]),
  trainerId: z.string().optional(),
});

export async function updateUser(userId: string, formData: FormData) {
  await requireAdmin();

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    trainerId: formData.get("trainerId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, role, trainerId } = parsed.data;

  if (role === "student" && !trainerId) {
    return { error: "Selecione o personal responsável pelo aluno." };
  }

  const emailOwner = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)))
    .limit(1);
  if (emailOwner.length > 0) return { error: "Já existe outro usuário com esse e-mail." };

  await db
    .update(users)
    .set({ name, email, role, trainerId: role === "student" ? trainerId : null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Se virou aluno agora (ou trocou de personal), garante a linha correspondente em `students`.
  if (role === "student") {
    const [existingStudent] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
    if (!existingStudent) {
      await db.insert(students).values({ userId, trainerId: trainerId! });
    } else if (existingStudent.trainerId !== trainerId) {
      await db.update(students).set({ trainerId, updatedAt: new Date() }).where(eq(students.userId, userId));
    }
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetUserPassword(userId: string) {
  await requireAdmin();

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 10);

  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { success: true, tempPassword };
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return { error: "Você não pode excluir a própria conta de admin." };

  try {
    await db.delete(users).where(eq(users.id, userId));
  } catch {
    return {
      error: "Não é possível excluir: este usuário tem registros vinculados (alunos, exercícios, cobranças etc.).",
    };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Exercícios (biblioteca global — visão do admin sobre todos os personais) */
/* ------------------------------------------------------------------ */

const exerciseSchema = z.object({
  trainerId: z.string().min(1, "Selecione o personal dono do exercício"),
  name: z.string().min(2, "Informe o nome do exercício"),
  muscleGroup: z.enum(MUSCLE_GROUPS as unknown as [MuscleGroup, ...MuscleGroup[]]),
  equipment: z.string().optional(),
  videoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  imageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instructions: z.string().optional(),
});

export async function listAllExercisesAdmin() {
  await requireAdmin();
  return db
    .select({
      id: exercises.id,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
      equipment: exercises.equipment,
      videoUrl: exercises.videoUrl,
      imageUrl: exercises.imageUrl,
      trainerId: exercises.trainerId,
      trainerName: users.name,
      createdAt: exercises.createdAt,
    })
    .from(exercises)
    .innerJoin(users, eq(users.id, exercises.trainerId))
    .orderBy(desc(exercises.createdAt));
}

export async function createExerciseAdmin(formData: FormData) {
  await requireAdmin();

  const parsed = exerciseSchema.safeParse({
    trainerId: formData.get("trainerId"),
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment") || undefined,
    videoUrl: formData.get("videoUrl") || "",
    imageUrl: formData.get("imageUrl") || "",
    instructions: formData.get("instructions") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.insert(exercises).values({
    trainerId: parsed.data.trainerId,
    name: parsed.data.name,
    muscleGroup: parsed.data.muscleGroup,
    equipment: parsed.data.equipment,
    videoUrl: parsed.data.videoUrl || undefined,
    imageUrl: parsed.data.imageUrl || undefined,
    instructions: parsed.data.instructions,
  });

  revalidatePath("/admin/exercises");
  return { success: true };
}

export async function updateExerciseAdmin(exerciseId: string, formData: FormData) {
  await requireAdmin();

  const parsed = exerciseSchema.safeParse({
    trainerId: formData.get("trainerId"),
    name: formData.get("name"),
    muscleGroup: formData.get("muscleGroup"),
    equipment: formData.get("equipment") || undefined,
    videoUrl: formData.get("videoUrl") || "",
    imageUrl: formData.get("imageUrl") || "",
    instructions: formData.get("instructions") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .update(exercises)
    .set({
      trainerId: parsed.data.trainerId,
      name: parsed.data.name,
      muscleGroup: parsed.data.muscleGroup,
      equipment: parsed.data.equipment,
      videoUrl: parsed.data.videoUrl || undefined,
      imageUrl: parsed.data.imageUrl || undefined,
      instructions: parsed.data.instructions,
    })
    .where(eq(exercises.id, exerciseId));

  revalidatePath("/admin/exercises");
  return { success: true };
}

export async function deleteExerciseAdmin(exerciseId: string) {
  await requireAdmin();
  await db.delete(exercises).where(eq(exercises.id, exerciseId));
  revalidatePath("/admin/exercises");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Planos (financeiro — visão do admin sobre todos os personais)       */
/* ------------------------------------------------------------------ */

export async function listAllPlansAdmin() {
  await requireAdmin();
  return db
    .select({
      id: plans.id,
      name: plans.name,
      priceCents: plans.priceCents,
      billingCycle: plans.billingCycle,
      sessionsIncluded: plans.sessionsIncluded,
      active: plans.active,
      trainerId: plans.trainerId,
      trainerName: users.name,
    })
    .from(plans)
    .innerJoin(users, eq(users.id, plans.trainerId))
    .orderBy(desc(plans.id));
}

export async function deletePlanAdmin(planId: string) {
  await requireAdmin();
  try {
    await db.delete(plans).where(eq(plans.id, planId));
  } catch {
    return { error: "Não é possível excluir: este plano tem assinaturas vinculadas." };
  }
  revalidatePath("/admin/plans");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Sessões (agenda — visão do admin sobre todos os personais)          */
/* ------------------------------------------------------------------ */

export async function listAllSessionsAdmin() {
  await requireAdmin();
  const studentUser = alias(users, "student_user");

  return db
    .select({
      id: sessions.id,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      mode: sessions.mode,
      status: sessions.status,
      confirmedByStudent: sessions.confirmedByStudent,
      trainerId: sessions.trainerId,
      trainerName: users.name,
      studentName: studentUser.name,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.trainerId))
    .innerJoin(students, eq(students.id, sessions.studentId))
    .innerJoin(studentUser, eq(studentUser.id, students.userId))
    .orderBy(desc(sessions.startsAt))
    .limit(300);
}

export async function deleteSessionAdmin(sessionId: string) {
  await requireAdmin();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  revalidatePath("/admin/sessions");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Pagamentos (financeiro — somente leitura, dados sensíveis)          */
/* ------------------------------------------------------------------ */

export async function listAllPaymentsAdmin() {
  await requireAdmin();
  const studentUser = alias(users, "payment_student_user");

  return db
    .select({
      id: payments.id,
      amountCents: payments.amountCents,
      method: payments.method,
      status: payments.status,
      dueDate: payments.dueDate,
      paidAt: payments.paidAt,
      studentName: studentUser.name,
    })
    .from(payments)
    .innerJoin(students, eq(students.id, payments.studentId))
    .innerJoin(studentUser, eq(studentUser.id, students.userId))
    .orderBy(desc(payments.dueDate))
    .limit(300);
}

/* ------------------------------------------------------------------ */
/* Ciclos de treino (visão do admin sobre todos os personais)          */
/* ------------------------------------------------------------------ */

export async function listAllCyclesAdmin() {
  await requireAdmin();
  const studentUser = alias(users, "cycle_student_user");

  return db
    .select({
      id: workoutCycles.id,
      name: workoutCycles.name,
      goal: workoutCycles.goal,
      startDate: workoutCycles.startDate,
      endDate: workoutCycles.endDate,
      isActive: workoutCycles.isActive,
      studentName: studentUser.name,
      trainerName: users.name,
    })
    .from(workoutCycles)
    .innerJoin(students, eq(students.id, workoutCycles.studentId))
    .innerJoin(studentUser, eq(studentUser.id, students.userId))
    .innerJoin(users, eq(users.id, students.trainerId))
    .orderBy(desc(workoutCycles.startDate))
    .limit(300);
}

export async function deleteCycleAdmin(cycleId: string) {
  await requireAdmin();
  await db.delete(workoutCycles).where(eq(workoutCycles.id, cycleId));
  revalidatePath("/admin/cycles");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Visão geral                                                         */
/* ------------------------------------------------------------------ */

export async function getAdminOverview() {
  await requireAdmin();
  const allUsers = await db.select({ role: users.role }).from(users);
  const allPayments = await db.select({ status: payments.status }).from(payments);
  const allSessions = await db.select({ status: sessions.status }).from(sessions);
  const allCycles = await db.select({ isActive: workoutCycles.isActive }).from(workoutCycles);

  return {
    totalUsers: allUsers.length,
    totalAdmins: allUsers.filter((u) => u.role === "admin").length,
    totalTrainers: allUsers.filter((u) => u.role === "trainer").length,
    totalStudents: allUsers.filter((u) => u.role === "student").length,
    pendingPayments: allPayments.filter((p) => p.status === "pending" || p.status === "overdue").length,
    upcomingSessions: allSessions.filter((s) => s.status === "scheduled" || s.status === "confirmed").length,
    activeCycles: allCycles.filter((c) => c.isActive).length,
  };
}