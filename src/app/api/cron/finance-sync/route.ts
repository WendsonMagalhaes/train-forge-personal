import { NextResponse } from "next/server";
import { syncAllStudentsFinanceLock } from "@/lib/finance/lock";

/**
 * Cron diário (ver vercel.json): marca cobranças vencidas como atrasadas e
 * bloqueia/desbloqueia os treinos dos alunos conforme a situação financeira.
 * Idempotente. Autenticação igual ao cron de lembretes (CRON_SECRET).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurada no servidor." }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await syncAllStudentsFinanceLock();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron:finance-sync] erro ao sincronizar financeiro:", err);
    return NextResponse.json({ error: "Erro ao sincronizar financeiro." }, { status: 500 });
  }
}
