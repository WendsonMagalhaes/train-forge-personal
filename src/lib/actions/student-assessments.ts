"use server";

import { db } from "@/db";
import { students, assessments, assessmentPhotos } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, asc, inArray } from "drizzle-orm";

async function requireStudent() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Não autorizado");

  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id)).limit(1);
  if (!student) throw new Error("Perfil de aluno não encontrado");
  return student;
}

// Versão somente-leitura de listAssessments (lib/actions/assessments.ts), mas
// autorizada pelo próprio aluno em vez de pelo personal responsável.
export async function getMyAssessments() {
  const student = await requireStudent();

  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.studentId, student.id))
    .orderBy(asc(assessments.assessedAt));

  if (rows.length === 0) return [];

  const photos = await db
    .select()
    .from(assessmentPhotos)
    .where(inArray(assessmentPhotos.assessmentId, rows.map((r) => r.id)));

  const photosByAssessment = new Map<string, typeof photos>();
  for (const photo of photos) {
    const list = photosByAssessment.get(photo.assessmentId) ?? [];
    list.push(photo);
    photosByAssessment.set(photo.assessmentId, list);
  }

  return rows.map((r) => ({ ...r, photos: photosByAssessment.get(r.id) ?? [] }));
}