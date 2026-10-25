import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncStudentFinanceLock } from "@/lib/finance/lock";

export type WorkoutAccess =
  | { allowed: true }
  | { allowed: false; reason: "locked" | "overdue" };

/**
 * Decide se o aluno pode ver/registrar treinos.
 * Reconcilia a situação financeira antes de decidir (cobre o caso do aluno
 * que acessa logo após o vencimento, sem esperar o cron).
 */
export async function getStudentWorkoutAccess(studentId: string): Promise<WorkoutAccess> {
  await syncStudentFinanceLock(studentId);

  const [student] = await db
    .select({ status: students.status, financeLocked: students.financeLocked })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!student) return { allowed: false, reason: "locked" };
  if (student.status === "locked") {
    return { allowed: false, reason: student.financeLocked ? "overdue" : "locked" };
  }
  return { allowed: true };
}
