import Link from "next/link";
import { getTodayWorkout } from "@/lib/actions/student-workout";
import { TodayWorkoutClient } from "./today-workout-client";
import { Panel } from "@/components/ui/panel";
import { Dumbbell, ChevronRight } from "lucide-react";

export default async function StudentTodayPage() {
  const { cycle, plan, blocks } = await getTodayWorkout();

  if (!cycle) {
    return (
      <Panel className="text-center">
        <p className="font-medium">Nenhum ciclo de treino ativo</p>
        <p className="text-sm text-[var(--muted)] mt-1">Fale com seu personal para montar sua ficha.</p>
      </Panel>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <p className="font-medium">Hoje é dia de descanso 🧘</p>
          <p className="text-sm text-[var(--muted)] mt-1">Nenhum treino programado para hoje.</p>
        </Panel>
        <MyWorkoutsLink />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl">Treino de hoje</h1>
      </div>
      <TodayWorkoutClient planId={plan.id} blocks={blocks} />
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