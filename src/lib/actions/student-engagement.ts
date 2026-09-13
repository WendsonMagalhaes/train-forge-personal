"use server";

import { db } from "@/db";
import { students, workoutLogs, workoutCycles, workoutPlans } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, gte, desc, sql } from "drizzle-orm";

async function requireTrainerForStudent(studentId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") throw new Error("Não autorizado");
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.trainerId, session.user.id)))
    .limit(1);
  if (!student) throw new Error("Aluno não encontrado");
  return student;
}

/**
 * "Check-in" aqui = um dia em que o aluno registrou execução de treino
 * (workout_logs). Não existe uma tabela de check-in separada — reaproveita o
 * que o aluno já registra ao treinar, sem exigir uma ação nova dele.
 */
export async function getStudentEngagement(studentId: string) {
  await requireTrainerForStudent(studentId);

  const [{ value: totalCheckins }] = await db
    .select({ value: sql<number>`count(distinct date(${workoutLogs.performedAt}))`.mapWith(Number) })
    .from(workoutLogs)
    .where(eq(workoutLogs.studentId, studentId));

  const [{ value: weeklyCheckins }] = await db
    .select({ value: sql<number>`count(distinct date(${workoutLogs.performedAt}))`.mapWith(Number) })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.studentId, studentId), gte(workoutLogs.performedAt, sql`date_trunc('week', now())`)));

  const [{ value: last30 }] = await db
    .select({ value: sql<number>`count(distinct date(${workoutLogs.performedAt}))`.mapWith(Number) })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.studentId, studentId), gte(workoutLogs.performedAt, sql`now() - interval '30 days'`)));

  // datas distintas de check-in, mais recentes primeiro — usadas pra calcular sequência e último check-in
  const dateRows = await db
    .select({ day: sql<string>`to_char(date(${workoutLogs.performedAt}), 'YYYY-MM-DD')`.as("day") })
    .from(workoutLogs)
    .where(eq(workoutLogs.studentId, studentId))
    .groupBy(sql`date(${workoutLogs.performedAt})`)
    .orderBy(desc(sql`date(${workoutLogs.performedAt})`));

  const days = dateRows.map((r) => r.day);

  // sequência atual: dias corridos consecutivos com check-in, contando a partir de hoje ou ontem
  let currentStreak = 0;
  if (days.length > 0) {
    const todayStr = new Date().toISOString().slice(0, 10);
    let cursor = new Date();
    if (days[0] !== todayStr) cursor.setDate(cursor.getDate() - 1); // ainda não fez check-in hoje, tudo bem — conta a partir de ontem

    const daySet = new Set(days);
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const daysSinceLastCheckin = days.length > 0
    ? Math.floor((Date.now() - new Date(days[0] + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // frequência semanal alvo, do ciclo ativo (mesma lógica usada no progresso do aluno)
  const [cycle] = await db
    .select()
    .from(workoutCycles)
    .where(and(eq(workoutCycles.studentId, studentId), eq(workoutCycles.isActive, true)))
    .orderBy(desc(workoutCycles.startDate))
    .limit(1);

  let weeklyTarget = 0;
  if (cycle) {
    const plans = await db.select({ weekdays: workoutPlans.weekdays }).from(workoutPlans).where(eq(workoutPlans.cycleId, cycle.id));
    weeklyTarget = plans.reduce((sum, p) => sum + (p.weekdays ? p.weekdays.split(",").filter(Boolean).length : 0), 0);
  }

  // aderência: check-ins dos últimos 30 dias vs. esperado pela frequência alvo
  const expectedLast30 = weeklyTarget > 0 ? Math.round((weeklyTarget * 30) / 7) : null;
  const adherencePct = expectedLast30 ? Math.min(100, Math.round((last30 / expectedLast30) * 100)) : null;

  // consistência: % das últimas 8 semanas com pelo menos 1 check-in (regularidade, não volume)
  const weekRows = await db
    .select({ week: sql<string>`date_trunc('week', ${workoutLogs.performedAt})`.as("week") })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.studentId, studentId), gte(workoutLogs.performedAt, sql`now() - interval '8 weeks'`)))
    .groupBy(sql`date_trunc('week', ${workoutLogs.performedAt})`);
  const consistencyPct = Math.round((weekRows.length / 8) * 100);

  // risco de abandono: heurística simples, não é ciência — sinaliza afastamento, não prevê o futuro
  let churnRisk: "baixo" | "medio" | "alto" = "baixo";
  if (daysSinceLastCheckin === null || daysSinceLastCheckin >= 14) churnRisk = "alto";
  else if (daysSinceLastCheckin >= 7 || (adherencePct !== null && adherencePct < 50)) churnRisk = "medio";

  return {
    totalCheckins,
    weeklyCheckins,
    weeklyTarget,
    currentStreak,
    daysSinceLastCheckin,
    adherencePct,
    consistencyPct,
    churnRisk,
  };
}

/** Lista de check-ins (treinos registrados) do aluno, mais recentes primeiro. */
export async function listCheckins(studentId: string) {
  await requireTrainerForStudent(studentId);

  return db
    .select({
      id: workoutLogs.id,
      performedAt: workoutLogs.performedAt,
      durationMinutes: workoutLogs.durationMinutes,
      overallFeeling: workoutLogs.overallFeeling,
      notes: workoutLogs.notes,
      planLabel: workoutPlans.label,
    })
    .from(workoutLogs)
    .leftJoin(workoutPlans, eq(workoutPlans.id, workoutLogs.planId))
    .where(eq(workoutLogs.studentId, studentId))
    .orderBy(desc(workoutLogs.performedAt));
}
