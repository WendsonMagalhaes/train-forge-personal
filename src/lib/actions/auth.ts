"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  let callbackUrl = (formData.get("callbackUrl") as string) || "";

  // Sem callbackUrl explícito (usuário não veio de um redirect de rota protegida) —
  // manda pra home certa de acordo com o papel dele.
  if (!callbackUrl) {
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.email, email)).limit(1);
    callbackUrl = user?.role === "admin" ? "/admin" : user?.role === "student" ? "/portal" : "/dashboard";
  }

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
