"use server";

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  students,
  users,
  payments,
  studentStatusLog,
  assessments,
  workoutLogs,
  workoutCycles,
  workoutPlans,
} from "@/db/schema";
import { auth } from "@/lib/auth";

export type ReportPeriod = { from: string; to: string }; // yyyy-mm-dd

async function requireTrainer() {
  const session = await auth();
  if (!session?.user || session.user.role !== "trainer") {
    throw new Error("Não autorizado.");
  }
  return session.user.id as string;
}

export async function defaultLast30DaysPeriod(): Promise<ReportPeriod> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

// ---------------------------------------------------------------------------
// Receita por período
// ---------------------------------------------------------------------------

export async function getRevenueByPeriod(period: ReportPeriod) {
  const trainerId = await requireTrainer();

  const rows = await db
    .select({
      day: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM-DD')`,
      totalCents: sql<number>`coalesce(sum(${payments.amountCents}), 0)`,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .where(
      and(
        eq(students.trainerId, trainerId),
        eq(payments.status, "paid"),
        gte(payments.paidAt, new Date(period.from)),
        lte(payments.paidAt, endOfDay(period.to))
      )
    )
    .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${payments.paidAt}, 'YYYY-MM-DD')`);

  const totalCents = rows.reduce((acc, r) => acc + Number(r.totalCents), 0);

  return {
    byDay: rows.map((r) => ({ day: r.day, totalCents: Number(r.totalCents) })),
    totalCents,
  };
}

// ---------------------------------------------------------------------------
// Taxa de adesão aos treinos
// (nº de treinos registrados no período ÷ nº de treinos esperados,
//  calculado a partir dos dias da semana configurados nas fichas ativas)
// ---------------------------------------------------------------------------

export async function getWorkoutAdherence(period: ReportPeriod) {
  const trainerId = await requireTrainer();
  const days = daysBetween(period.from, period.to);

  const activeStudents = await db
    .select({ id: students.id, name: users.name })
    .from(students)
    .innerJoin(users, eq(students.userId, users.id))
    .where(and(eq(students.trainerId, trainerId), eq(students.status, "active")));

  const results: {
    studentId: string;
    name: string;
    expected: number;
    performed: number;
    adherencePct: number;
  }[] = [];

  for (const student of activeStudents) {
    const plans = await db
      .select({ weekdays: workoutPlans.weekdays })
      .from(workoutPlans)
      .innerJoin(workoutCycles, eq(workoutPlans.cycleId, workoutCycles.id))
      .where(and(eq(workoutCycles.studentId, student.id), eq(workoutCycles.isActive, true)));

    const weekdaysConfigured = new Set(
      plans.flatMap((p) => (p.weekdays ? p.weekdays.split(",").map((d) => d.trim()) : []))
    );

    const expected = countMatchingWeekdays(period.from, period.to, weekdaysConfigured);

    const [{ performed }] = await db
      .select({ performed: sql<number>`count(*)` })
      .from(workoutLogs)
      .where(
        and(
          eq(workoutLogs.studentId, student.id),
          gte(workoutLogs.performedAt, new Date(period.from)),
          lte(workoutLogs.performedAt, endOfDay(period.to))
        )
      );

    results.push({
      studentId: student.id,
      name: student.name,
      expected,
      performed: Number(performed),
      adherencePct: expected > 0 ? Math.min(100, Math.round((Number(performed) / expected) * 100)) : 0,
    });
  }

  const totalExpected = results.reduce((a, r) => a + r.expected, 0);
  const totalPerformed = results.reduce((a, r) => a + r.performed, 0);

  return {
    perStudent: results.sort((a, b) => a.adherencePct - b.adherencePct),
    overallPct: totalExpected > 0 ? Math.round((totalPerformed / totalExpected) * 100) : 0,
    periodDays: days,
  };
}

const WEEKDAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function countMatchingWeekdays(from: string, to: string, codes: Set<string>) {
  if (codes.size === 0) return 0;
  let count = 0;
  const cursor = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cursor <= end) {
    if (codes.has(WEEKDAY_CODES[cursor.getDay()])) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function daysBetween(from: string, to: string) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function endOfDay(dateStr: string) {
  return new Date(dateStr + "T23:59:59");
}

// ---------------------------------------------------------------------------
// Retenção / Churn
// ---------------------------------------------------------------------------

export async function getRetentionChurn(period: ReportPeriod) {
  const trainerId = await requireTrainer();

  const [{ activeAtStart }] = await db
    .select({ activeAtStart: sql<number>`count(*)` })
    .from(students)
    .where(
      and(
        eq(students.trainerId, trainerId),
        lte(students.startedAt, period.from)
      )
    );

  const [{ newStudents }] = await db
    .select({ newStudents: sql<number>`count(*)` })
    .from(students)
    .where(
      and(
        eq(students.trainerId, trainerId),
        gte(students.startedAt, period.from),
        lte(students.startedAt, period.to)
      )
    );

  const churnedRows = await db
    .select({ studentId: studentStatusLog.studentId })
    .from(studentStatusLog)
    .innerJoin(students, eq(studentStatusLog.studentId, students.id))
    .where(
      and(
        eq(students.trainerId, trainerId),
        gte(studentStatusLog.changedAt, new Date(period.from)),
        lte(studentStatusLog.changedAt, endOfDay(period.to)),
        sql`${studentStatusLog.newStatus} in ('inactive', 'locked')`
      )
    );

  const churned = new Set(churnedRows.map((r) => r.studentId)).size;
  const base = Number(activeAtStart) || 1;

  return {
    activeAtStart: Number(activeAtStart),
    newStudents: Number(newStudents),
    churned,
    churnRatePct: Math.round((churned / base) * 1000) / 10,
  };
}

// ---------------------------------------------------------------------------
// Evolução física consolidada (primeira vs. última avaliação no período,
// entre todos os alunos ativos do personal)
// ---------------------------------------------------------------------------

export async function getPhysicalEvolutionSummary(period: ReportPeriod) {
  const trainerId = await requireTrainer();

  const activeStudents = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.trainerId, trainerId), eq(students.status, "active")));

  let studentsWithData = 0;
  let weightDeltaSum = 0;
  let bodyFatDeltaSum = 0;
  let muscleMassDeltaSum = 0;

  for (const student of activeStudents) {
    const rows = await db
      .select({
        assessedAt: assessments.assessedAt,
        weightKg: assessments.weightKg,
        bodyFatPct: assessments.bodyFatPct,
        muscleMassKg: assessments.muscleMassKg,
      })
      .from(assessments)
      .where(
        and(
          eq(assessments.studentId, student.id),
          gte(assessments.assessedAt, period.from),
          lte(assessments.assessedAt, period.to)
        )
      )
      .orderBy(asc(assessments.assessedAt));

    if (rows.length < 2) continue;

    const first = rows[0];
    const last = rows[rows.length - 1];
    studentsWithData++;

    weightDeltaSum += numOrZero(last.weightKg) - numOrZero(first.weightKg);
    bodyFatDeltaSum += numOrZero(last.bodyFatPct) - numOrZero(first.bodyFatPct);
    muscleMassDeltaSum += numOrZero(last.muscleMassKg) - numOrZero(first.muscleMassKg);
  }

  return {
    studentsWithData,
    avgWeightDeltaKg: studentsWithData ? round1(weightDeltaSum / studentsWithData) : 0,
    avgBodyFatDeltaPct: studentsWithData ? round1(bodyFatDeltaSum / studentsWithData) : 0,
    avgMuscleMassDeltaKg: studentsWithData ? round1(muscleMassDeltaSum / studentsWithData) : 0,
  };
}

function numOrZero(v: string | null) {
  return v ? Number(v) : 0;
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
