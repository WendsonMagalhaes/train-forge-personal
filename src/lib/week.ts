/**
 * Início da semana atual (segunda-feira, 00:00 no horário de Brasília), como instante UTC.
 * Usado para zerar a marcação dos exercícios toda semana. O fuso de Brasília é fixo (UTC-3, sem horário de verão),
 * então a segunda 00:00 BRT é segunda 03:00 UTC.
 */
export function startOfWeekBR(now: Date = new Date()): Date {
  const todayBR = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now); // YYYY-MM-DD
  const dayOfWeek = new Date(`${todayBR}T12:00:00Z`).getUTCDay(); // 0 = domingo
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const monday = new Date(`${todayBR}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  const mondayStr = monday.toISOString().slice(0, 10);

  return new Date(`${mondayStr}T03:00:00Z`);
}
