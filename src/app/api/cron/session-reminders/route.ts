import { NextResponse } from "next/server";
import { sendUpcomingSessionReminders } from "@/lib/actions/reminders";

/**
 * Endpoint chamado periodicamente pelo Vercel Cron (ver vercel.json) para
 * disparar lembretes das sessões próximas. Idempotente — pode rodar com
 * qualquer frequência sem duplicar lembretes (ver sendUpcomingSessionReminders).
 *
 * Autenticação: a Vercel assina automaticamente as chamadas de cron com
 * "Authorization: Bearer $CRON_SECRET". Fora da Vercel (ex.: teste manual
 * em dev, ou outro provedor de cron), envie o mesmo header manualmente.
 *
 * Configuração necessária:
 * - CRON_SECRET          -> mesmo valor usado pela Vercel para assinar o cron
 * - REMINDER_WINDOW_HOURS -> opcional, default 24 (ver lib/actions/reminders.ts)
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurada no servidor." },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await sendUpcomingSessionReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron:session-reminders] erro ao enviar lembretes:", err);
    return NextResponse.json({ error: "Erro ao processar lembretes." }, { status: 500 });
  }
}
