"use server";

import { db } from "@/db";
import { sessions, students } from "@/db/schema";
import { auth } from "@/lib/auth";
import { notify } from "@/lib/actions/communication";
import { and, asc, eq, gte, isNull, lte, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Janela de antecedência (em horas) para disparar o lembrete de sessão.
 * Configurável via env var; default: lembra sessões que começam nas
 * próximas 24h. Ver REMINDER_WINDOW_HOURS no .env.local.
 */
function reminderWindowHours() {
  const raw = process.env.REMINDER_WINDOW_HOURS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}

function formatSessionDateTime(startsAt: Date) {
  return startsAt.toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Job de lembrete de sessão — pensado para ser chamado por um cron
 * (ver /api/cron/session-reminders), sem sessão de usuário autenticado.
 *
 * Regra: para toda sessão "scheduled"/"confirmed" que começa dentro da
 * janela configurada e ainda não teve reminderSentAt preenchido, cria uma
 * notificação in-app pro aluno e marca a sessão como lembrada — idempotente,
 * então pode rodar com qualquer frequência (a cada hora, por exemplo) sem
 * duplicar lembretes.
 */
export async function sendUpcomingSessionReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + reminderWindowHours() * 60 * 60_000);

  const due = await db
    .select({
      id: sessions.id,
      startsAt: sessions.startsAt,
      mode: sessions.mode,
      location: sessions.location,
      studentUserId: students.userId,
    })
    .from(sessions)
    .innerJoin(students, eq(students.id, sessions.studentId))
    .where(
      and(
        inArray(sessions.status, ["scheduled", "confirmed"]),
        isNull(sessions.reminderSentAt),
        gte(sessions.startsAt, now),
        lte(sessions.startsAt, windowEnd)
      )
    )
    .orderBy(asc(sessions.startsAt));

  for (const s of due) {
    await notify(s.studentUserId, {
      type: "session_reminder",
      title: "Sessão de treino se aproxima",
      body: `Você tem sessão ${formatSessionDateTime(new Date(s.startsAt))}${
        s.location ? ` — ${s.location}` : ""
      }. Confirme sua presença.`,
      link: "/portal/schedule",
    });

    await db.update(sessions).set({ reminderSentAt: new Date() }).where(eq(sessions.id, s.id));
  }

  return { sent: due.length, windowHours: reminderWindowHours() };
}

/**
 * Disparo manual pelo personal ("Enviar lembrete agora"), pra sessões que
 * ele quer lembrar o aluno na hora, sem esperar o cron. Reenviável mesmo se
 * já houver reminderSentAt (ex.: aluno ainda não confirmou véspera da sessão).
 */
export async function sendSessionReminderNow(sessionId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");

  const [row] = await db
    .select({
      id: sessions.id,
      startsAt: sessions.startsAt,
      location: sessions.location,
      status: sessions.status,
      studentUserId: students.userId,
    })
    .from(sessions)
    .innerJoin(students, eq(students.id, sessions.studentId))
    .where(and(eq(sessions.id, sessionId), eq(sessions.trainerId, session.user.id)))
    .limit(1);

  if (!row) throw new Error("Sessão não encontrada.");
  if (row.status !== "scheduled" && row.status !== "confirmed") {
    throw new Error("Só é possível lembrar sessões agendadas ou confirmadas.");
  }

  await notify(row.studentUserId, {
    type: "session_reminder",
    title: "Sessão de treino se aproxima",
    body: `Você tem sessão ${formatSessionDateTime(new Date(row.startsAt))}${
      row.location ? ` — ${row.location}` : ""
    }. Confirme sua presença.`,
    link: "/portal/schedule",
  });

  await db.update(sessions).set({ reminderSentAt: new Date() }).where(eq(sessions.id, row.id));

  revalidatePath("/dashboard/schedule");
  return { success: true };
}
