import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Cliente de Web Push (VAPID) — funciona em qualquer navegador com suporte a
 * Push API (Chrome, Edge, Firefox; Safari/iOS a partir do PWA instalado).
 *
 * Variáveis de ambiente necessárias:
 * - VAPID_PUBLIC_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY -> mesma chave pública
 *   (uma exposta ao servidor, outra ao browser — ver .env.example)
 * - VAPID_PRIVATE_KEY -> chave privada, nunca exposta ao cliente
 * - VAPID_SUBJECT      -> "mailto:contato@seudominio.com", exigido pelo padrão VAPID
 *
 * Gerar o par de chaves: `npx web-push generate-vapid-keys`
 *
 * Sem as env vars configuradas, sendPushToUser() é um no-op (loga um aviso).
 */

let configured = false;
function ensureConfigured() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return false;

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
};

/** Envia uma push notification pra todas as inscrições ativas de um usuário. Remove inscrições inválidas/expiradas. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) {
    console.warn("[push] VAPID keys não configuradas — push não enviado:", payload.title);
    return { sent: 0, reason: "not_configured" as const };
  }

  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  if (subs.length === 0) return { sent: 0, reason: "no_subscriptions" as const };

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404/410 = inscrição expirada ou revogada pelo navegador — limpa do banco.
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error("[push] erro ao enviar notificação:", err);
        }
      }
    })
  );

  return { sent };
}
