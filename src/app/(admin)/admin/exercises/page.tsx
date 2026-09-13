import { listAllExercisesAdmin, listTrainersForPicker } from "@/lib/actions/admin";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { MUSCLE_GROUP_LABEL } from "@/lib/constants";
import { NewExerciseButton } from "./new-exercise-button";
import { EditExerciseButton } from "./edit-exercise-button";
import { DeleteExerciseButton } from "./delete-button";

export default async function AdminExercisesPage() {
  const [items, trainerOptions] = await Promise.all([listAllExercisesAdmin(), listTrainersForPicker()]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Exercícios (todos os personais)</h1>
        <NewExerciseButton trainerOptions={trainerOptions} />
      </div>

      {items.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            Nenhum exercício cadastrado ainda. Clique em <b className="text-[var(--foreground)]">Novo exercício</b>.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ex) => (
            <Panel key={ex.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{ex.name}</p>
                  <Badge variant="outline">{MUSCLE_GROUP_LABEL[ex.muscleGroup as keyof typeof MUSCLE_GROUP_LABEL]}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">Personal: {ex.trainerName}</p>
                {ex.equipment && <p className="mt-1 text-xs text-[var(--muted)]">Equipamento: {ex.equipment}</p>}
                {ex.videoUrl && (
                  <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-[var(--primary)]">
                    Ver vídeo de execução
                  </a>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <EditExerciseButton exercise={ex} trainerOptions={trainerOptions} />
                <DeleteExerciseButton id={ex.id} name={ex.name} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
