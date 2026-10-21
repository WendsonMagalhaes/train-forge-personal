"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Panel } from "@/components/ui/panel";
import { WEEKDAY_OPTIONS } from "@/lib/constants";
import { WEEK_ORDER, parseWeekdays, type WeekdayCode } from "@/lib/workout-schedule";
import { cn } from "@/lib/utils";
import { TodayWorkoutClient, type Block } from "./today-workout-client";

// getDay() começa no domingo; WEEK_ORDER começa na segunda.
const CODE_BY_JS_DAY: WeekdayCode[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const FULL_DAY_LABEL: Record<WeekdayCode, string> = {
  mon: "segunda", tue: "terça", wed: "quarta", thu: "quinta", fri: "sexta", sat: "sábado", sun: "domingo",
};

const SHORT_LABEL = Object.fromEntries(WEEKDAY_OPTIONS.map((w) => [w.value, w.label])) as Record<WeekdayCode, string>;

const noopSubscribe = () => () => {};

function localIsoDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Data de hoje no fuso do próprio aluno (o servidor pode estar em outro fuso).
 * No servidor e na hidratação retorna null, então não há divergência entre HTML e cliente.
 */
function useTodayDate(): Date | null {
  const iso = useSyncExternalStore(noopSubscribe, localIsoDate, () => null);
  return useMemo(() => {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [iso]);
}

export type PlanSummary = { id: string; label: string; weekdays: string | null };

export function WeekWorkoutClient({
  plans, blocksByPlan,
}: {
  plans: PlanSummary[];
  blocksByPlan: Record<string, Block[]>;
}) {
  const todayDate = useTodayDate();
  const today = todayDate ? CODE_BY_JS_DAY[todayDate.getDay()] : null;
  const [picked, setPicked] = useState<WeekdayCode | null>(null);
  const selected = picked ?? today;

  // Dia do mês de cada dia da semana (semana de segunda a domingo que contém hoje).
  const dayNumbers = useMemo(() => {
    if (!todayDate) return null;
    const mondayOffset = (todayDate.getDay() + 6) % 7;
    const out = {} as Record<WeekdayCode, number>;
    WEEK_ORDER.forEach((code, i) => {
      out[code] = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - mondayOffset + i).getDate();
    });
    return out;
  }, [todayDate]);

  // Dia → fichas que treinam nesse dia (uma ficha com vários dias aparece em cada um deles).
  const plansByDay = useMemo(() => {
    const map = new Map<WeekdayCode, PlanSummary[]>();
    for (const plan of plans) {
      for (const day of parseWeekdays(plan.weekdays)) {
        map.set(day, [...(map.get(day) ?? []), plan]);
      }
    }
    return map;
  }, [plans]);

  const dayPlans = selected ? plansByDay.get(selected) ?? [] : [];
  const isToday = selected !== null && selected === today;
  const dayName = selected ? FULL_DAY_LABEL[selected] : "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Seus treinos</h1>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Toque em um dia para ver o treino.</p>
      </div>

      {/* Faixa da semana: Seg → Dom. Abre no dia atual. */}
      <div role="group" aria-label="Dias da semana" className="grid grid-cols-7 gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1">
        {WEEK_ORDER.map((code) => {
          const active = code === selected;
          const hasWorkout = plansByDay.has(code);
          const isTodayCell = code === today;
          return (
            <button
              key={code}
              type="button"
              aria-pressed={active}
              aria-label={`${FULL_DAY_LABEL[code]}${hasWorkout ? ", tem treino" : ""}${isTodayCell ? ", hoje" : ""}`}
              onClick={() => setPicked(code)}
              className={cn(
                "tf-tap flex flex-col items-center gap-0.5 rounded-[3px] py-2 transition-colors",
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]",
                isTodayCell && !active && "text-[var(--foreground)] ring-1 ring-inset ring-[var(--primary)]"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider">{SHORT_LABEL[code]}</span>
              <span className="font-display text-base leading-none">{dayNumbers?.[code] ?? " "}</span>
              <span
                className={cn(
                  "mt-0.5 h-1 w-1 rounded-full",
                  !hasWorkout && "bg-transparent",
                  hasWorkout && (active ? "bg-[var(--primary-foreground)]" : "bg-[var(--primary)]")
                )}
              />
            </button>
          );
        })}
      </div>

      {selected === null ? null : dayPlans.length === 0 ? (
        <Panel className="py-6 text-center">
          <p className="font-medium">{isToday ? "Hoje é dia de descanso 🧘" : `Descanso na ${dayName}`}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Nenhum treino programado para este dia.</p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl">{isToday ? "Treino de hoje" : `Treino de ${dayName}`}</h2>

          {dayPlans.map((plan) => {
            const blocks = blocksByPlan[plan.id] ?? [];
            return (
              <section key={plan.id} className="flex flex-col gap-3">
                <p className="text-sm font-medium text-[var(--muted)]">{plan.label}</p>
                {blocks.length === 0 ? (
                  <Panel>
                    <p className="text-sm text-[var(--muted)]">Esta ficha ainda não tem exercícios cadastrados.</p>
                  </Panel>
                ) : (
                  <TodayWorkoutClient key={plan.id} planId={plan.id} blocks={blocks} />
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
