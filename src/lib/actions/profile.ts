"use server";

import { db } from "@/db";
import { users, students } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/** Garante um número dentro de [min, max]; cai pro default se vier algo inválido (não numérico). */
function clampNumber(value: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Foto de perfil — vale tanto pro personal quanto pro aluno, ambos são linhas de `users`. */
export async function updateMyAvatar(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Não autorizado" };

  const image = (formData.get("avatarUrl") as string)?.trim() || null;
  const avatarZoomPct = clampNumber(formData.get("avatarZoomPct"), 100, 250, 100);
  const avatarPositionX = clampNumber(formData.get("avatarPositionX"), 0, 100, 50);
  const avatarPositionY = clampNumber(formData.get("avatarPositionY"), 0, 100, 50);

  await db
    .update(users)
    .set({ image, avatarZoomPct, avatarPositionX, avatarPositionY, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard", "layout");
  revalidatePath("/portal", "layout");

  return { success: true };
}

export async function removeMyAvatar() {
  const session = await auth();
  if (!session?.user) return { error: "Não autorizado" };

  await db
    .update(users)
    .set({ image: null, avatarZoomPct: 100, avatarPositionX: 50, avatarPositionY: 50, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard", "layout");
  revalidatePath("/portal", "layout");

  return { success: true };
}

/** Dados próprios do aluno (nome/e-mail de `users` + telefone/nascimento/gênero/objetivos de `students`). */
export async function getMyProfile() {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") throw new Error("Não autorizado");

  const [me] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  const [student] = await db.select().from(students).where(eq(students.userId, session.user.id)).limit(1);

  return { user: me, student };
}

export async function updateMyStudentInfo(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "student") return { error: "Não autorizado" };

  const phone = (formData.get("phone") as string)?.trim() || null;
  const birthDate = (formData.get("birthDate") as string)?.trim() || null;
  const gender = (formData.get("gender") as string)?.trim() || null;
  const goals = formData.getAll("goals") as string[];

  await db
    .update(students)
    .set({ phone, birthDate, gender, goals, updatedAt: new Date() })
    .where(eq(students.userId, session.user.id));

  revalidatePath("/portal/profile");
  return { success: true };
}
