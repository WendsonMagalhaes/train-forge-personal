import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Session } from "next-auth";

export type Branding = {
  brandColor: string | null;
  logoUrl: string | null;
  logoSizePct: number;
  logoPositionX: number;
  logoPositionY: number;
};

const EMPTY_BRANDING: Branding = {
  brandColor: null,
  logoUrl: null,
  logoSizePct: 100,
  logoPositionX: 50,
  logoPositionY: 50,
};

const BRANDING_COLUMNS = {
  brandColor: users.brandColor,
  logoUrl: users.logoUrl,
  logoSizePct: users.logoSizePct,
  logoPositionX: users.logoPositionX,
  logoPositionY: users.logoPositionY,
};

/**
 * Personal: usa a própria cor de marca e logo (com tamanho/posição definidos por ele).
 * Aluno: usa a cor de marca e logo do personal dele (trainerId em `users`), incluindo
 * o mesmo ajuste de tamanho/posição que o personal configurou.
 */
export async function resolveBranding(session: Session | null): Promise<Branding> {
  if (!session?.user) return EMPTY_BRANDING;

  if (session.user.role === "trainer") {
    const [row] = await db.select(BRANDING_COLUMNS).from(users).where(eq(users.id, session.user.id)).limit(1);
    return row ? { ...EMPTY_BRANDING, ...row } : EMPTY_BRANDING;
  }

  if (session.user.role === "student") {
    const [studentRow] = await db
      .select({ trainerId: users.trainerId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!studentRow?.trainerId) return EMPTY_BRANDING;

    const [trainerRow] = await db.select(BRANDING_COLUMNS).from(users).where(eq(users.id, studentRow.trainerId)).limit(1);
    return trainerRow ? { ...EMPTY_BRANDING, ...trainerRow } : EMPTY_BRANDING;
  }

  return EMPTY_BRANDING;
}
