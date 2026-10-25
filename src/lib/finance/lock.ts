import { db } from "@/db";
import { payments, students, studentStatusLog, subscriptions } from "@/db/schema";
import { and, eq, gt, inArray, lt, type SQL } from "drizzle-orm";
import { subDays } from "date-fns";
import { dateInSaoPaulo } from "@/lib/dates";

export { dateInSaoPaulo };

/**
 * Dias de tolerância depois do vencimento antes de bloquear os treinos.
 * 0 = bloqueia já no dia seguinte ao vencimento não pago.
 */
export const FINANCE_GRACE_DAYS = 0;

type StudentStatus = "active" | "inactive" | "locked";

function liveSubscriptionIds() {
  return db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["active", "past_due"]));
}

/**
 * Cobranças pendentes com vencimento anterior à tolerância viram "overdue".
 * Cobre cobranças manuais (PIX/dinheiro), que não geram webhook de atraso no Asaas.
 */
export async function markPastDuePayments(studentId?: string) {
  const cutoff = dateInSaoPaulo(subDays(new Date(), FINANCE_GRACE_DAYS));
  await db
    .update(payments)
    .set({ status: "overdue" })
    .where(
      and(
        studentId ? eq(payments.studentId, studentId) : undefined,
        eq(payments.status, "pending"),
        lt(payments.dueDate, cutoff),
        inArray(payments.subscriptionId, liveSubscriptionIds()),
      ),
    );
}

async function applyStatus(
  studentId: string,
  previousStatus: StudentStatus,
  newStatus: StudentStatus,
  financeLocked: boolean,
  reason: string,
) {
  await db
    .update(students)
    .set({ status: newStatus, financeLocked, updatedAt: new Date() })
    .where(eq(students.id, studentId));

  await db.insert(studentStatusLog).values({ studentId, previousStatus, newStatus, reason });
}

/**
 * Reconcilia o status do aluno com a situação financeira. Idempotente: pode
 * ser chamada a qualquer momento sem duplicar efeitos.
 *
 * - Tem cobrança vencida (e não perdoada pela liberação manual) e o aluno está
 *   ativo -> bloqueia automaticamente (financeLocked = true).
 * - Não tem mais cobrança vencida e o bloqueio era do financeiro -> libera sozinho.
 * - Trancamento manual do personal nunca é desfeito automaticamente.
 */
export async function syncStudentFinanceLock(studentId: string) {
  await markPastDuePayments(studentId);

  const [student] = await db
    .select({
      status: students.status,
      financeLocked: students.financeLocked,
      financeOverrideAt: students.financeOverrideAt,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student || student.status === "inactive") return;

  const conditions: SQL[] = [
    eq(payments.studentId, studentId),
    eq(payments.status, "overdue"),
    inArray(payments.subscriptionId, liveSubscriptionIds()),
  ];
  if (student.financeOverrideAt) {
    conditions.push(gt(payments.dueDate, dateInSaoPaulo(student.financeOverrideAt)));
  }

  const [overdue] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(...conditions))
    .limit(1);
  const hasOverdue = Boolean(overdue);

  if (hasOverdue && student.status === "active") {
    await applyStatus(studentId, "active", "locked", true, "Bloqueado automaticamente: mensalidade em atraso");
  } else if (!hasOverdue && student.financeLocked) {
    if (student.status === "locked") {
      await applyStatus(studentId, "locked", "active", false, "Desbloqueado automaticamente: mensalidade regularizada");
    } else {
      await db.update(students).set({ financeLocked: false }).where(eq(students.id, studentId));
    }
  }
}

/** Usado pelo cron diário: reconcilia todos os alunos que não estão inativos. */
export async function syncAllStudentsFinanceLock() {
  await markPastDuePayments();
  const rows = await db.select({ id: students.id, status: students.status }).from(students);
  let checked = 0;
  for (const row of rows) {
    if (row.status === "inactive") continue;
    await syncStudentFinanceLock(row.id);
    checked++;
  }
  return { checked };
}
