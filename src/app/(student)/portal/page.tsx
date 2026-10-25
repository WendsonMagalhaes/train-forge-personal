import Link from "next/link";
import { listMyWorkoutPlans, getWorkoutPlanDetail, getMyWorkoutAccess } from "@/lib/actions/student-workout";
import { WeekWorkoutClient } from "./week-workout-client";
import { Panel } from "@/components/ui/panel";
import { Dumbbell, ChevronRight } from "lucide-react";
import { WorkoutsBlockedPanel } from "./workouts-blocked-panel";

export default async function StudentTodayPage() {
  const access = await getMyWorkoutAccess();

  // Bloqueio só afeta a ficha de exercícios; a navegação continua na barra inferior.
  if (!access.allowed) return <WorkoutsBlockedPanel reason={access.reason} />;

  const { cycle, plans } = await listMyWorkoutPlans();

  if (!cycle) {
    return (
      <Panel className="text-center">
        <p className="font-medium">Nenhum ciclo de treino ativo</p>
        <p className="text-sm text-[var(--muted)] mt-1">Fale com seu personal para montar sua ficha.</p>
      </Panel>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <p className="font-medium">Nenhuma ficha cadastrada</p>
          <p className="text-sm text-[var(--muted)] mt-1">Seu personal ainda não montou as fichas do ciclo.</p>
        </Panel>
      </div>
    );
  }

  // Carrega os exercícios de todas as fichas de uma vez: trocar de dia na faixa semanal fica instantâneo.
  const details = await Promise.all(plans.map((p) => getWorkoutPlanDetail(p.id)));
  const blocksByPlan = Object.fromEntries(plans.map((p, i) => [p.id, details[i].blocks]));

  return (
    <div className="space-y-4">
      <WeekWorkoutClient
        plans={plans.map((p) => ({ id: p.id, label: p.label, weekdays: p.weekdays }))}
        blocksByPlan={blocksByPlan}
      />
      <MyWorkoutsLink />
    </div>
  );
}

function MyWorkoutsLink() {
  return (
    <Link href="/portal/workouts">
      <Panel className="flex items-center gap-3 transition-colors hover:border-[var(--primary)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
          <Dumbbell className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Meus treinos</span>
          <span className="block text-xs text-[var(--muted)]">Veja todas as fichas do seu ciclo atual</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      </Panel>
    </Link>
  );
}
