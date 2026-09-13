import { NextResponse } from "next/server";
import { isValidWebhookToken } from "@/lib/payments/asaas";
import { handleAsaasWebhookEvent } from "@/lib/actions/finance";

/**
 * Webhook de reconciliação de pagamentos via Asaas.
 *
 * Configuração necessária no painel do Asaas (Integrações > Webhooks):
 * - URL: https://SEU_DOMINIO/api/webhooks/payments
 * - Token de acesso: mesmo valor da env var ASAAS_WEBHOOK_TOKEN
 * - Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE
 *
 * O Asaas envia o token configurado no header "asaas-access-token" — sem
 * ele batendo com ASAAS_WEBHOOK_TOKEN, o payload é rejeitado (fail closed).
 */
export async function POST(req: Request) {
  const receivedToken = req.headers.get("asaas-access-token");
  if (!isValidWebhookToken(receivedToken)) {
    return NextResponse.json({ error: "Token de webhook inválido." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.event || !body?.payment?.id) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  try {
    const result = await handleAsaasWebhookEvent(body.event, {
      id: body.payment.id,
      billingType: body.payment.billingType,
      paymentDate: body.payment.paymentDate,
      confirmedDate: body.payment.confirmedDate,
    });
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error("[webhook:payments] erro ao processar evento Asaas:", err);
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 });
  }
}
