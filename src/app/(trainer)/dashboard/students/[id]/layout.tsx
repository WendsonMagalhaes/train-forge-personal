import { db } from "@/db";
import { students, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { StudentTabs } from "./tabs";
import { getStudentEngagement } from "@/lib/actions/student-engagement";
import { Flame, CalendarCheck, Target, Activity, AlertTriangle, ListChecks } from "lucide-react";

const statusLabel: Record<string, { text: string; variant: "success" | "outline" | "danger" }> = {
  active: { text: "Ativo", variant: "success" },
  inactive: { text: "Inativo", variant: "outline" },
  locked: { text: "Trancado", variant: "danger" },
};

const CHURN_LABEL: Record<string, { text: string; variant: "success" | "outline" | "danger" }> = {
  baixo: { text: "Baixo", variant: "success" },
  medio: { text: "Médio", variant: "outline" },
  alto: { text: "Alto", variant: "danger" },
};

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db
    .select({ name: users.name, email: users.email, status: students.status })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(eq(students.id, id))
    .limit(1);

  if (!row) notFound();

  const engagement = await getStudentEngagement(id);
  const churn = CHURN_LABEL[engagement.churnRisk];

  const stats = [
    { icon: CalendarCheck, label: "check-ins na semana", value: `${engagement.weeklyCheckins}${engagement.weeklyTarget ? `/${engagement.weeklyTarget}` : ""}` },
    { icon: Flame, label: "sequência atual", value: `${engagement.currentStreak} dia${engagement.currentStreak === 1 ? "" : "s"}` },
    { icon: Target, label: "aderência", value: engagement.adherencePct !== null ? `${engagement.adherencePct}%` : "—" },
    { icon: Activity, label: "consistência", value: `${engagement.consistencyPct}%` },
    { icon: ListChecks, label: "total de check-ins", value: `${engagement.totalCheckins}` },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl">{row.name}</h1>
          <p className="truncate text-sm text-[var(--muted)]">{row.email}</p>
        </div>
        <Badge variant={statusLabel[row.status].variant}>{statusLabel[row.status].text}</Badge>
      </div>

      {/* Resumo de engajamento — "check-in" = dia com treino registrado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="tf-panel flex flex-col gap-1.5 p-4">
            <s.icon className="h-4 w-4 text-[var(--muted)]" />
            <span className="font-display text-2xl leading-none">{s.value}</span>
            <span className="text-xs leading-tight text-[var(--muted)]">{s.label}</span>
          </div>
        ))}
        <div className="tf-panel flex flex-col gap-1.5 p-4">
          <AlertTriangle className="h-4 w-4 text-[var(--muted)]" />
          <Badge variant={churn.variant}>{churn.text}</Badge>
          <span className="text-xs leading-tight text-[var(--muted)]">risco de abandono</span>
        </div>
      </div>

      <StudentTabs studentId={id} />

      {children}
    </div>
  );
}
