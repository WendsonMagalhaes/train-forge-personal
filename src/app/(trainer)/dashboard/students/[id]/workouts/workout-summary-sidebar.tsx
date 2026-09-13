"use client";

import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { WEEKDAY_OPTIONS, MUSCLE_GROUP_LABEL } from "@/lib/constants";
import { CalendarDays, Dumbbell, ListChecks } from "lucide-react";

type BlockItem = { muscleGroup: string };
type Block = { exercises: BlockItem[] };
type Plan = { id: string; label: string; weekdays: string | null; blocks: Block[] };
type Cycle = { id: string; name: string; isActive: boolean | null; plans: Plan[] };

const WEEKDAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_LABEL = Object.fromEntries(WEEKDAY_OPTIONS.map((w) => [w.value, w.label]));

function findNextPlan(plans: Plan[]) {
  const todayIndex = new Date().getDay();
  for (let offset = 0; offset < 7; offset++) {
    const code = WEEKDAY_CODES[(todayIndex + offset) % 7];
    const plan = plans.find((p) => (p.weekdays ?? "").split(",").map((c) => c.trim()).includes(code));
    if (plan) return { plan, isToday: offset === 0, weekdayLabel: WEEKDAY_LABEL[code] };
  }
  return null;
}

export function WorkoutSummarySidebar({ cycles }: { cycles: Cycle[] }) {
  const activeCycle = cycles.find((c) => c.isActive) ?? null;

  if (!activeCycle) {
    return (
      <Panel>
        <p className="text-sm text-[var(--muted)]">Nenhum ciclo ativo no momento — o resumo aparece aqui assim que houver um.</p>
      </Panel>
    );
  }

  const next = findNextPlan(activeCycle.plans);
  const totalExercises = activeCycle.plans.reduce(
    (sum, p) => sum + p.blocks.reduce((s, b) => s + b.exercises.length, 0),
    0
  );
  const weeklyFrequency = activeCycle.plans.reduce(
    (sum, p) => sum + (p.weekdays ? p.weekdays.split(",").filter(Boolean).length : 0),
    0
  );
  const muscleGroups = Array.from(
    new Set(activeCycle.plans.flatMap((p) => p.blocks.flatMap((b) => b.exercises.map((e) => e.muscleGroup))))
  );

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader>
          <PanelTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" /> Próximo treino
          </PanelTitle>
        </PanelHeader>
        {next ? (
          <>
            <p className="font-display text-xl">{next.plan.label}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {next.isToday ? "Hoje" : next.weekdayLabel} · {next.plan.blocks.reduce((s, b) => s + b.exercises.length, 0)} exercício(s)
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">Nenhuma ficha com dia da semana definido no ciclo ativo.</p>
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> Resumo do ciclo
          </PanelTitle>
        </PanelHeader>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted)]">Fichas</dt>
            <dd className="font-display text-xl">{activeCycle.plans.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Frequência/semana</dt>
            <dd className="font-display text-xl">{weeklyFrequency}x</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-[var(--muted)]">Exercícios no ciclo</dt>
            <dd className="font-display text-xl">{totalExercises}</dd>
          </div>
        </dl>

        {muscleGroups.length > 0 && (
          <div className="tf-hairline mt-4 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Dumbbell className="h-3.5 w-3.5" /> Grupos musculares trabalhados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {muscleGroups.map((g) => (
                <Badge key={g} variant="outline">{MUSCLE_GROUP_LABEL[g as keyof typeof MUSCLE_GROUP_LABEL] ?? g}</Badge>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
