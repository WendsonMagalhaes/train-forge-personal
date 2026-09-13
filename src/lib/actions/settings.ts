"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { isValidHex } from "@/lib/theme/brand-color";
import { revalidatePath } from "next/cache";

export async function updateBrandColor(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    return { error: "Não autorizado" };
  }

  const color = formData.get("brandColor") as string;
  if (!isValidHex(color)) {
    return { error: "Cor inválida. Use um código hexadecimal, ex: #fdc903" };
  }

  await db.update(users).set({ brandColor: color, updatedAt: new Date() }).where(eq(users.id, session.user.id));

  // revalida todo o painel do personal E o portal dos alunos dele, pois a cor propaga pra ambos
  revalidatePath("/dashboard", "layout");
  revalidatePath("/portal", "layout");

  return { success: true };
}

/** Garante um número dentro de [min, max]; cai pro default se vier algo inválido (não numérico). */
function clampNumber(value: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function updateLogo(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    return { error: "Não autorizado" };
  }

  const logoUrl = (formData.get("logoUrl") as string)?.trim() || null;
  const logoSizePct = clampNumber(formData.get("logoSizePct"), 50, 300, 100);
  const logoPositionX = clampNumber(formData.get("logoPositionX"), 0, 100, 50);
  const logoPositionY = clampNumber(formData.get("logoPositionY"), 0, 100, 50);

  // Paleta extraída no client (canvas) a partir do arquivo da logo — validada
  // aqui antes de gravar (só hex válido, no máximo 8 cores).
  let logoPaletteColors: string[] | null = null;
  const rawPalette = (formData.get("logoPaletteColors") as string) || "";
  if (rawPalette) {
    try {
      const parsed = JSON.parse(rawPalette);
      if (Array.isArray(parsed)) {
        logoPaletteColors = parsed.filter((c) => typeof c === "string" && isValidHex(c)).slice(0, 8);
      }
    } catch {
      // paleta inválida — segue sem ela, não é crítico pro salvamento da logo
    }
  }

  await db
    .update(users)
    .set({
      logoUrl,
      logoSizePct,
      logoPositionX,
      logoPositionY,
      ...(logoUrl ? { logoPaletteColors } : { logoPaletteColors: null }),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  // revalida todo o painel do personal E o portal dos alunos dele, pois a logo propaga pra ambos
  revalidatePath("/dashboard", "layout");
  revalidatePath("/portal", "layout");

  return { success: true };
}

export async function removeLogo() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    return { error: "Não autorizado" };
  }

  await db
    .update(users)
    .set({
      logoUrl: null,
      logoSizePct: 100,
      logoPositionX: 50,
      logoPositionY: 50,
      logoPaletteColors: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard", "layout");
  revalidatePath("/portal", "layout");

  return { success: true };
}
