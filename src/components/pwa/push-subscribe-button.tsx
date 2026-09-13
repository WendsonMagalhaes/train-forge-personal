"use client";

import * as React from "react";
import { BellPlus, BellOff } from "lucide-react";
import { savePushSubscription, deletePushSubscription, hasActivePushSubscription } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}


type Status = "checking" | "unsupported" | "subscribed" | "unsubscribed";

/**
 * Botão discreto pra ativar/desativar push notifications neste navegador.
 * Some silenciosamente se o navegador não suportar Push API (ex.: Safari
 * fora do modo PWA instalado) ou se NEXT_PUBLIC_VAPID_PUBLIC_KEY não estiver
 * configurada.
 */

export function PushSubscribeButton() {
  const [status, setStatus] = React.useState<Status>("checking");
  const [pending, setPending] = React.useState(false);

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  React.useEffect(() => {
    if (!vapidKey || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      Promise.resolve().then(() => setStatus("unsupported"));
      return;
    }
    hasActivePushSubscription()
      .then((active) => setStatus(active ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsubscribed"));
  }, [vapidKey]);

  async function subscribe() {
    if (!vapidKey) return;
    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("unsubscribed");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = subscription.toJSON();
      await savePushSubscription({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
      setStatus("subscribed");
    } catch (err) {
      console.error("[push] erro ao ativar notificações:", err);
    } finally {
      setPending(false);
    }
  }

  async function unsubscribe() {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch (err) {
      console.error("[push] erro ao desativar notificações:", err);
    } finally {
      setPending(false);
    }
  }

  if (status === "checking" || status === "unsupported") return null;

  return (
    <button
      type="button"
      disabled={pending}
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--primary)] disabled:opacity-60"
    >
      {status === "subscribed" ? (
        <>
          <BellOff className="h-3.5 w-3.5" /> Desativar push
        </>
      ) : (
        <>
          <BellPlus className="h-3.5 w-3.5" /> Ativar push
        </>
      )}
    </button>
  );
}
