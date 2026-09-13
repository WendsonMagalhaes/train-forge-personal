"use server";

import { db } from "@/db";
import { sessions, students, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, asc, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");
  return session.user;
}

const sessionSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno"),
  date: z.string().min(1, "Informe a data"),
  startTime: z.string().min(1, "Informe o horário de início"),
  durationMinutes: z.coerce.number().int().min(15).default(60),
  mode: z.enum(["in_person", "online"]).default("in_person"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function listUpcomingSessions() {
  const trainer = await requireTrainer();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return db
    .select({
      id: sessions.id,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      mode: sessions.mode,
      location: sessions.location,
      status: sessions.status,
      confirmedByStudent: sessions.confirmedByStudent,
      reminderSentAt: sessions.reminderSentAt,
      studentId: students.id,
      studentName: users.name,
    })
    .from(sessions)
    .innerJoin(students, eq(students.id, sessions.studentId))
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(sessions.trainerId, trainer.id), gte(sessions.startsAt, now), ne(sessions.status, "canceled")))
    .orderBy(asc(sessions.startsAt));
}

export async function createSession(formData: FormData) {
  const trainer = await requireTrainer();

  const parsed = sessionSchema.safeParse({
    studentId: formData.get("studentId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    durationMinutes: formData.get("durationMinutes") || 60,
    mode: formData.get("mode") || "in_person",
    location: formData.get("location") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { studentId, date, startTime, durationMinutes, mode, location, notes } = parsed.data;

  const startsAt = new Date(`${date}T${startTime}:00`);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  await db.insert(sessions).values({
    trainerId: trainer.id,
    studentId,
    startsAt,
    endsAt,
    mode,
    location,
    notes,
    status: "scheduled",
  });

  revalidatePath("/dashboard/schedule");
  return { success: true };
}

export async function updateSessionStatus(
  sessionId: string,
  status: "completed" | "missed" | "canceled" | "confirmed"
) {
  const trainer = await requireTrainer();
  await db
    .update(sessions)
    .set({ status })
    .where(and(eq(sessions.id, sessionId), eq(sessions.trainerId, trainer.id)));

  revalidatePath("/dashboard/schedule");
  return { success: true };
}

export async function deleteSession(sessionId: string) {
  const trainer = await requireTrainer();
  await db.delete(sessions).where(and(eq(sessions.id, sessionId), eq(sessions.trainerId, trainer.id)));
  revalidatePath("/dashboard/schedule");
}

export async function listStudentsForPicker() {
  const trainer = await requireTrainer();
  return db
    .select({ id: students.id, name: users.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(students.trainerId, trainer.id), eq(students.status, "active")))
    .orderBy(asc(users.name));
}
