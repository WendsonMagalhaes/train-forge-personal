// Ordenação das fichas de treino pela semana (Seg → Dom).

export const WEEK_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayCode = (typeof WEEK_ORDER)[number];

/** Dias de uma ficha ("mon,thu") convertidos para a lista na ordem da semana, sem valores inválidos. */
export function parseWeekdays(weekdays: string | null | undefined): WeekdayCode[] {
  const codes = (weekdays ?? "").split(",").map((c) => c.trim());
  return WEEK_ORDER.filter((code) => codes.includes(code));
}

export type ScheduledPlanEntry<T> = { plan: T; weekday: WeekdayCode | null };

/**
 * Transforma as fichas em uma agenda semanal (Seg → Dom).
 * Uma ficha com mais de um dia aparece uma vez para cada dia.
 * Fichas sem dia definido ficam no fim, na ordem recebida.
 */
export function expandPlansBySchedule<T extends { weekdays: string | null }>(plans: T[]): ScheduledPlanEntry<T>[] {
  const scheduled: ScheduledPlanEntry<T>[] = [];
  const unscheduled: ScheduledPlanEntry<T>[] = [];

  for (const plan of plans) {
    const days = parseWeekdays(plan.weekdays);
    if (days.length === 0) {
      unscheduled.push({ plan, weekday: null });
      continue;
    }
    for (const weekday of days) scheduled.push({ plan, weekday });
  }

  // sort é estável: fichas no mesmo dia mantêm a ordem recebida (orderIndex)
  scheduled.sort((a, b) => WEEK_ORDER.indexOf(a.weekday!) - WEEK_ORDER.indexOf(b.weekday!));
  return [...scheduled, ...unscheduled];
}

/**
 * Ordena as fichas (uma vez cada) pelo primeiro dia da semana em que aparecem.
 * Fichas sem dia definido ficam no fim.
 */
export function sortPlansByWeekday<T extends { weekdays: string | null }>(plans: T[]): T[] {
  const firstDayIndex = (plan: T) => {
    const days = parseWeekdays(plan.weekdays);
    return days.length > 0 ? WEEK_ORDER.indexOf(days[0]) : WEEK_ORDER.length;
  };
  return [...plans].sort((a, b) => firstDayIndex(a) - firstDayIndex(b));
}
