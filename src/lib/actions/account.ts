"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth, signOut } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";

const newPasswordSchema = z
  .object({
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

/**
 * Usado tanto no fluxo obrigatório (senha provisória / reset pelo admin) quanto
 * numa futura tela de "trocar minha senha" espontânea — em ambos os casos o
 * usuário já está autenticado (via senha provisória ou senha atual).
 */
export async function setNewPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const passwordHash = await hash(parsed.data.password, 10);

  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  // Desloga e manda pro login de novo — mais simples e seguro do que tentar
  // "atualizar" a sessão JWT em memória, e garante que o token novo já vem
  // com mustChangePassword: false.
  await signOut({ redirectTo: "/login?passwordChanged=1" });
}
