"use server";

import { db } from "@/db";
import { users, students, studentNotes, studentStatusLog, studentHealthHistory } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createStudentSchema, healthHistorySchema } from "@/lib/validations/student";
import { eq, and, desc } from "drizzle-orm";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    throw new Error("Não autorizado");
  }
  return session.user;
}

export async function createStudent(formData: FormData) {
  const trainer = await requireTrainer();

  const parsed = createStudentSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    gender: formData.get("gender") || undefined,
    goals: formData.getAll("goals").filter(Boolean) as string[],
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, phone, birthDate, gender, goals } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { error: "Já existe um usuário com esse e-mail." };
  }

  // senha temporária — aluno é obrigado a trocar no primeiro acesso (ver mustChangePassword)
  const tempPassword = randomBytes(6).toString("hex");
  const passwordHash = await hash(tempPassword, 10);

  const [newUser] = await db
    .insert(users)
    .values({ name, email, passwordHash, role: "student", trainerId: trainer.id, mustChangePassword: true })
    .returning();

  await db.insert(students).values({
    userId: newUser.id,
    trainerId: trainer.id,
    phone,
    birthDate: birthDate || null,
    gender,
    goals,
  });

  revalidatePath("/dashboard/students");
  // Retornado uma única vez para o personal repassar ao aluno — não fica salvo em lugar nenhum.
  return { success: true, credentials: { email, tempPassword } };
}

export async function listStudents() {
  const trainer = await requireTrainer();

  return db
    .select({
      id: students.id,
      status: students.status,
      goals: students.goals,
      startedAt: students.startedAt,
      name: users.name,
      email: users.email,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(students.trainerId, trainer.id))
    .orderBy(desc(students.createdAt));
}

export async function getStudent(studentId: string) {
  const trainer = await requireTrainer();

  const [row] = await db
    .select({
      id: students.id,
      status: students.status,
      goals: students.goals,
      phone: students.phone,
      birthDate: students.birthDate,
      gender: students.gender,
      startedAt: students.startedAt,
      name: users.name,
      email: users.email,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainer.id)))
    .limit(1);

  if (!row) return null;

  const [health] = await db
    .select()
    .from(studentHealthHistory)
    .where(eq(studentHealthHistory.studentId, studentId))
    .orderBy(desc(studentHealthHistory.updatedAt))
    .limit(1);

  const notes = await db
    .select()
    .from(studentNotes)
    .where(eq(studentNotes.studentId, studentId))
    .orderBy(desc(studentNotes.createdAt));

  return { ...row, health: health ?? null, notes };
}

export async function saveHealthHistory(studentId: string, formData: FormData) {
  await requireTrainer();

  const raw = Object.fromEntries(formData.entries());
  const parsed = healthHistorySchema.safeParse({
    hasInjuries: raw.hasInjuries === "on",
    injuriesDetail: raw.injuriesDetail || undefined,
    hasChronicConditions: raw.hasChronicConditions === "on",
    chronicConditionsDetail: raw.chronicConditionsDetail || undefined,
    medications: raw.medications || undefined,
    medicalRestrictions: raw.medicalRestrictions || undefined,
    familyHistory: raw.familyHistory || undefined,
    smoker: raw.smoker === "on",
    alcoholUse: raw.alcoholUse || undefined,
    sleepQuality: raw.sleepQuality || undefined,
    stressLevel: raw.stressLevel || undefined,
    physicalActivityHistory: raw.physicalActivityHistory || undefined,
    medicalClearance: raw.medicalClearance === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await db.insert(studentHealthHistory).values({ studentId, ...parsed.data });

  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

export async function addStudentNote(studentId: string, formData: FormData) {
  const trainer = await requireTrainer();
  const content = formData.get("content") as string;
  if (!content?.trim()) return { error: "Escreva uma observação." };

  await db.insert(studentNotes).values({
    studentId,
    authorId: trainer.id,
    content,
    type: "general",
  });

  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

export async function updateStudentStatus(
  studentId: string,
  newStatus: "active" | "inactive" | "locked",
  reason?: string
) {
  await requireTrainer();

  const [current] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!current) return { error: "Aluno não encontrado" };

  await db.update(students).set({ status: newStatus, updatedAt: new Date() }).where(eq(students.id, studentId));

  await db.insert(studentStatusLog).values({
    studentId,
    previousStatus: current.status,
    newStatus,
    reason,
  });

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/students");
  return { success: true };
}
