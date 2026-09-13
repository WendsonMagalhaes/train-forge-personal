import { Resend } from "resend";

/** URL base do app, usada pra montar links absolutos em e-mails (o link salvo em notifications é sempre relativo, ex.: "/portal/chat"). */
export function appBaseUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

/**
 * Cliente mínimo de e-mail via Resend (https://resend.com).
 *
 * Variáveis de ambiente necessárias:
 * - RESEND_API_KEY   -> chave de API do Resend
 * - RESEND_FROM_EMAIL -> remetente verificado no Resend, ex:
 *                        "Train Forge <notificacoes@seudominio.com>"
 *
 * Sem RESEND_API_KEY configurada, sendEmail() é um no-op (loga um aviso) —
 * assim o app funciona normalmente em dev sem exigir conta no Resend.
 */

let client: Resend | null = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; reason?: string }> {
  const resend = getClient();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    console.warn(
      "[email] RESEND_API_KEY/RESEND_FROM_EMAIL não configuradas — e-mail não enviado:",
      input.subject
    );
    return { sent: false, reason: "not_configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      console.error("[email] erro ao enviar via Resend:", error);
      return { sent: false, reason: "provider_error" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] erro inesperado ao enviar e-mail:", err);
    return { sent: false, reason: "unexpected_error" };
  }
}

/** Template simples e responsivo, com a identidade Train Forge, pra qualquer notificação por e-mail. */
export function renderNotificationEmail(input: { title: string; body?: string; ctaLabel?: string; ctaUrl?: string }) {
  const { title, body, ctaLabel, ctaUrl } = input;
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0d0d0e; color: #f2f1ec;">
    <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #fdc903; margin: 0 0 16px;">Train Forge</p>
    <h1 style="font-size: 20px; margin: 0 0 12px;">${title}</h1>
    ${body ? `<p style="font-size: 14px; line-height: 1.6; color: #b9b6ae; margin: 0 0 20px;">${body}</p>` : ""}
    ${
      ctaLabel && ctaUrl
        ? `<a href="${ctaUrl}" style="display: inline-block; padding: 10px 18px; background: #fdc903; color: #141311; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">${ctaLabel}</a>`
        : ""
    }
  </div>`;
}
