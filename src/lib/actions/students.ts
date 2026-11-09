"use server";

import { db } from "@/db";
import { users, students, studentNotes, studentStatusLog, studentHealthHistory } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createStudentSchema, healthHistorySchema } from "@/lib/validations/student";
import { toDbText, toDbTextOrNull } from "@/lib/text-case";
import { encryptProvisionalPassword, decryptProvisionalPassword } from "@/lib/crypto/provisional-password";
import { eq, and, desc, ne } from "drizzle-orm";
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

  const { name, phone, birthDate, gender, goals } = parsed.data;
  // E-mail: só sem espaços nas pontas — o login compara exatamente como está gravado.
  const cleanEmail = parsed.data.email.trim();

  const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
  if (existing.length > 0) {
    return { error: "Já existe um usuário com esse e-mail." };
  }

  // senha temporária — aluno é obrigado a trocar no primeiro acesso (ver mustChangePassword)
  const tempPassword = randomBytes(6).toString("hex");
  const passwordHash = await hash(tempPassword, 10);

  const [newUser] = await db
    .insert(users)
    .values({
      name: toDbText(name),
      email: cleanEmail,
      passwordHash,
      role: "student",
      trainerId: trainer.id,
      mustChangePassword: true,
      provisionalPasswordEnc: encryptProvisionalPassword(tempPassword),
    })
    .returning();

  await db.insert(students).values({
    userId: newUser.id,
    trainerId: trainer.id,
    phone: phone || null,
    birthDate: birthDate || null,
    gender: toDbTextOrNull(gender),
    goals,
  });

  revalidatePath("/dashboard/students");
  // Retornado uma única vez para o personal repassar ao aluno — não fica salvo em lugar nenhum.
  return { success: true, credentials: { email: cleanEmail, tempPassword } };
}

/**
 * Dados do primeiro acesso do aluno, para o personal repassar pelo WhatsApp.
 * Só o personal dono do aluno consegue ler; a senha só é devolvida enquanto
 * o aluno ainda não trocou a senha provisória.
 */
export async function getStudentFirstAccess(studentId: string) {
  const trainer = await requireTrainer();

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      phone: students.phone,
      mustChangePassword: users.mustChangePassword,
      provisionalPasswordEnc: users.provisionalPasswordEnc,
      firstAccessAt: users.firstAccessAt,
    })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainer.id)))
    .limit(1);

  if (!row) return null;

  const pending = row.mustChangePassword;
  return {
    name: row.name,
    email: row.email,
    phone: row.phone,
    pending,
    password: pending ? decryptProvisionalPassword(row.provisionalPasswordEnc) : null,
    firstAccessAt: row.firstAccessAt ? row.firstAccessAt.toISOString() : null,
  };
}

/**
 * Gera uma nova senha provisória para um aluno do personal. Usado quando a senha
 * não está guardada (cadastros feitos antes desta função) ou quando o aluno
 * esqueceu a senha. A nova senha substitui a anterior.
 */
export async function regenerateStudentPassword(studentId: string) {
  const trainer = await requireTrainer();

  const [row] = await db
    .select({ userId: students.userId, email: users.email })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainer.id)))
    .limit(1);

  if (!row) return { error: "Aluno não encontrado." };

  const tempPassword = randomBytes(6).toString("hex");
  const passwordHash = await hash(tempPassword, 10);

  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: true,
      provisionalPasswordEnc: encryptProvisionalPassword(tempPassword),
      updatedAt: new Date(),
    })
    .where(eq(users.id, row.userId));

  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true, credentials: { email: row.email, tempPassword } };
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
      userId: students.userId,
      status: students.status,
      financeLocked: students.financeLocked,
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

  // Liberar manualmente um aluno trancado (inclusive por atraso) perdoa as cobranças
  // vencidas até agora; um atraso novo, com vencimento posterior, volta a bloquear.
  const unlockingLocked = current.status === "locked" && newStatus === "active";
  await db
    .update(students)
    .set({
      status: newStatus,
      updatedAt: new Date(),
      financeLocked: false,
      ...(unlockingLocked ? { financeOverrideAt: new Date() } : {}),
    })
    .where(eq(students.id, studentId));

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

/**
 * Edição dos dados de cadastro pelo personal (nome, e-mail, telefone, etc).
 * Texto é gravado em maiúsculas; o e-mail só tem espaços das pontas removidos.
 */
export async function updateStudent(studentId: string, formData: FormData) {
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

  const { name, phone, birthDate, gender, goals } = parsed.data;
  const cleanEmail = parsed.data.email.trim();

  const [current] = await db
    .select({ userId: students.userId })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.trainerId, trainer.id)))
    .limit(1);
  if (!current) return { error: "Aluno não encontrado." };

  // o e-mail não pode pertencer a outro usuário (exceto o próprio aluno)
  const [emailTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, cleanEmail), ne(users.id, current.userId)))
    .limit(1);
  if (emailTaken) return { error: "Já existe um usuário com esse e-mail." };

  await db
    .update(users)
    .set({ name: toDbText(name), email: cleanEmail, updatedAt: new Date() })
    .where(eq(users.id, current.userId));

  await db
    .update(students)
    .set({
      phone: phone || null,
      birthDate: birthDate || null,
      gender: toDbTextOrNull(gender),
      goals,
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath("/dashboard/students");
  return { success: true };
}
