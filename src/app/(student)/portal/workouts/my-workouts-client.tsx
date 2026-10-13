"use client";

import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Dumbbell } from "lucide-react";
import { expandPlansBySchedule, parseWeekdays } from "@/lib/workout-schedule";

const WEEKDAY_LABEL: Record<string, string> = {
  sun: "Dom", mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sáb",
};
const TODAY_CODE = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][new Date().getDay()];

type Cycle = { id: string; name: string; goal: string | null; startDate: string; endDate: string | null };
type Plan = { id: string; label: string; weekdays: string | null; orderIndex: number | null; exerciseCount: number };

export function MyWorkoutsClient({ cycle, plans }: { cycle: Cycle; plans: Plan[] }) {
  // Agenda da semana (Seg → Dom): ficha com mais de um dia aparece em cada um deles.
  const entries = expandPlansBySchedule(plans);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl">Meus treinos</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          {cycle.name}
          {cycle.goal && <> · {cycle.goal}</>}
        </p>
      </div>

      {plans.length === 0 ? (
        <Panel className="text-center">
          <p className="text-sm text-[var(--muted)]">Esse ciclo ainda não tem fichas cadastradas.</p>
        </Panel>
      ) : (
        <div className="space-y-3">
          {entries.map(({ plan, weekday }, i) => {
            const days = parseWeekdays(plan.weekdays);
            const isToday = weekday === TODAY_CODE;
            return (
              <Link key={`${plan.id}-${weekday ?? "sem-dia"}-${i}`} href={`/portal/workouts/${plan.id}`}>
                <Panel className="flex items-center gap-3 transition-colors hover:border-[var(--primary)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-medium text-[var(--primary)]">
                    {weekday ? WEEKDAY_LABEL[weekday] : <Dumbbell className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{plan.label}</span>
                      {isToday && <Badge variant="success">Hoje</Badge>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--muted)]">
                      {days.length > 0 ? days.map((d) => WEEKDAY_LABEL[d]).join(" · ") : "Sem dia fixo"}
                      <span>· {plan.exerciseCount} {plan.exerciseCount === 1 ? "exercício" : "exercícios"}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                </Panel>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
