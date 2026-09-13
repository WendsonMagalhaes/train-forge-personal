"use server";

import { db } from "@/db";
import { sessions, students } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, asc, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function requireStudent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Não autorizado");

  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id)).limit(1);
  if (!student) throw new Error("Perfil de aluno não encontrado");
  return student;
}

export async function listMySessions() {
  const student = await requireStudent();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.studentId, student.id), gte(sessions.startsAt, now), ne(sessions.status, "canceled")))
    .orderBy(asc(sessions.startsAt));
}

export async function confirmMySession(sessionId: string) {
  const student = await requireStudent();

  await db
    .update(sessions)
    .set({ confirmedByStudent: true, status: "confirmed" })
    .where(and(eq(sessions.id, sessionId), eq(sessions.studentId, student.id)));

  revalidatePath("/portal/schedule");
  return { success: true };
}
