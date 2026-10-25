"use server";
import { parseDecimalBR } from "@/lib/numbers";

import { db } from "@/db";
import { students, assessments, assessmentPhotos } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

const numOrUndef = () =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined));

const assessmentSchema = z.object({
  assessedAt: z.string().min(1, "Informe a data"),
  weightKg: numOrUndef(),
  heightCm: numOrUndef(),
  bodyFatPct: numOrUndef(),
  muscleMassKg: numOrUndef(),
  waistCm: numOrUndef(),
  hipCm: numOrUndef(),
  chestCm: numOrUndef(),
  armRightCm: numOrUndef(),
  armLeftCm: numOrUndef(),
  thighRightCm: numOrUndef(),
  thighLeftCm: numOrUndef(),
  notes: z.string().optional(),
  photoFrontUrl: z.string().url().optional().or(z.literal("")),
  photoSideUrl: z.string().url().optional().or(z.literal("")),
  photoBackUrl: z.string().url().optional().or(z.literal("")),
});

export async function listAssessments(studentId: string) {
  await requireTrainerForStudent(studentId);
  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.studentId, studentId))
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

export async function createAssessment(studentId: string, formData: FormData) {
  await requireTrainerForStudent(studentId);

  const raw = Object.fromEntries(formData.entries());
  const parsed = assessmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { photoFrontUrl, photoSideUrl, photoBackUrl, ...measures } = parsed.data;

  // converte os valores digitados em pt-BR ("96,5") para número antes de gravar
  const DECIMAL_LABELS: Record<string, string> = {
    weightKg: "Peso", heightCm: "Altura", bodyFatPct: "% Gordura", muscleMassKg: "Massa magra",
    waistCm: "Cintura", hipCm: "Quadril", chestCm: "Peito", armRightCm: "Braço D.",
    armLeftCm: "Braço E.", thighRightCm: "Coxa D.", thighLeftCm: "Coxa E.",
  };
  const converted: Record<string, string | undefined> = {};
  for (const [field, label] of Object.entries(DECIMAL_LABELS)) {
    const raw = (measures as Record<string, string | undefined>)[field];
    if (raw === undefined) continue;
    const n = parseDecimalBR(raw);
    if (n === null) return { error: `Valor inválido em ${label}` };
    converted[field] = String(n);
  }

  const [assessment] = await db.insert(assessments).values({
    studentId,
    ...measures,
    ...converted,
  }).returning();

  const photos = [
    { angle: "front", url: photoFrontUrl },
    { angle: "side", url: photoSideUrl },
    { angle: "back", url: photoBackUrl },
  ].filter((p): p is { angle: string; url: string } => !!p.url);

  if (photos.length > 0) {
    await db.insert(assessmentPhotos).values(
      photos.map((p) => ({ assessmentId: assessment.id, angle: p.angle, url: p.url }))
    );
  }

  revalidatePath(`/dashboard/students/${studentId}/assessments`);
  return { success: true };
}

export async function deleteAssessment(studentId: string, assessmentId: string) {
  await requireTrainerForStudent(studentId);
  await db.delete(assessments).where(and(eq(assessments.id, assessmentId), eq(assessments.studentId, studentId)));
  revalidatePath(`/dashboard/students/${studentId}/assessments`);
}

export async function deleteAssessmentPhoto(studentId: string, photoId: string) {
  await requireTrainerForStudent(studentId);
  await db.delete(assessmentPhotos).where(eq(assessmentPhotos.id, photoId));
  revalidatePath(`/dashboard/students/${studentId}/assessments`);
}