import { listWorkoutLogs } from "@/lib/actions/workouts";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";

const FEELING_VARIANT = {
  leve: "outline",
  moderado: "secondary",
  intenso: "warning",
  exausto: "danger",
} as const;

export default async function StudentWorkoutHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logs = await listWorkoutLogs(id);

  if (logs.length === 0) {
    return (
      <Panel className="text-center">
        <p className="font-medium">Nenhum treino registrado ainda</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Assim que o aluno concluir um treino pelo portal, o histórico aparece aqui.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => (
        <Panel key={log.id}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{log.planLabel ?? "Treino avulso"}</p>
              <p className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <Clock className="h-3 w-3" />
                {new Date(log.performedAt).toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
                {log.durationMinutes ? ` · ${log.durationMinutes} min` : ""}
              </p>
            </div>
            {log.overallFeeling && (
              <Badge variant={FEELING_VARIANT[log.overallFeeling as keyof typeof FEELING_VARIANT] ?? "outline"}>
                {log.overallFeeling}
              </Badge>
            )}
          </div>

          {log.notes && <p className="mb-3 text-sm text-[var(--muted)]">{log.notes}</p>}

          {log.exercises.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-3">
              {log.exercises.map((ex, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className={ex.skipped ? "text-[var(--muted)] line-through" : ""}>
                    {ex.exerciseName ?? "Exercício removido"}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    {ex.hadPain && (
                      <span className="flex items-center gap-1 text-red-500" title={ex.painDetail ?? "Relatou dor"}>
                        <AlertTriangle className="h-3.5 w-3.5" /> dor
                      </span>
                    )}
                    {ex.loadKg ? `${ex.loadKg}kg` : ""}
                    {ex.repsCompleted ? ` · ${ex.repsCompleted}` : ""}
                    {ex.difficultyRpe ? ` · RPE ${ex.difficultyRpe}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      ))}
    </div>
  );
}
