import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, sessions } from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { UserPlus, CalendarPlus, MessageSquarePlus, Users, CalendarCheck2, TrendingUp, CircleDollarSign } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const trainerId = session!.user.id;

  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(students)
    .where(and(eq(students.trainerId, trainerId), eq(students.status, "active")));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ value: todaySessions }] = await db
    .select({ value: count() })
    .from(sessions)
    .where(and(eq(sessions.trainerId, trainerId), gte(sessions.startsAt, today)));

  const cards = [
    { label: "Alunos ativos", value: activeCount, icon: Users },
    { label: "Sessões hoje", value: todaySessions, icon: CalendarCheck2 },
    { label: "Adesão ao treino (7d)", value: "—", icon: TrendingUp },
    { label: "Inadimplência", value: "—", icon: CircleDollarSign },
  ];

  const quickActions = [
    { href: "/dashboard/students", label: "Novo aluno", icon: UserPlus },
    { href: "/dashboard/schedule", label: "Nova sessão", icon: CalendarPlus },
    { href: "/dashboard/chat", label: "Mensagem", icon: MessageSquarePlus },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl mb-5">Visão Geral</h1>

      {/* Ações rápidas — chips horizontais, padrão "app" (só aparecem no mobile) */}
      <div className="tf-scroll-x -mx-1 mb-5 gap-2.5 px-1 md:hidden">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="tf-tap flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium"
          >
            <a.icon className="h-4 w-4 text-[var(--primary)]" />
            {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Panel key={c.label} className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">{c.label}</p>
              <c.icon className="h-3.5 w-3.5 text-[var(--muted)]" />
            </div>
            <p className="font-display text-2xl md:text-3xl mt-2">{c.value}</p>
          </Panel>
        ))}
      </div>

      <div className="mt-5 md:mt-6">
        <Panel>
          <PanelHeader>
            <PanelTitle>Próximos passos</PanelTitle>
          </PanelHeader>
          <p className="text-sm text-[var(--muted)]">
            Cadastre seu primeiro aluno em <b className="text-[var(--foreground)]">Alunos → Novo aluno</b> para
            começar a montar fichas de treino e agendar sessões.
          </p>
        </Panel>
      </div>
    </div>
  );
}
