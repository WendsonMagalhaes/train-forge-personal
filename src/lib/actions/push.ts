"use server";

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Salva (ou atualiza) a inscrição de push do navegador atual pro usuário logado. */
export async function savePushSubscription(sub: PushSubscriptionInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado.");

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: session.user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });

  return { success: true };
}

/** Remove a inscrição de push (usuário desativou notificações neste navegador). */
export async function deletePushSubscription(endpoint: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado.");

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, session.user.id)));

  return { success: true };
}

/** Verifica se o usuário logado já tem alguma inscrição de push ativa (qualquer navegador). */
export async function hasActivePushSubscription() {
  const session = await auth();
  if (!session?.user) return false;

  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, session.user.id))
    .limit(1);

  return Boolean(row);
}
