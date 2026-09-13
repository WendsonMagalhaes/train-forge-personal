// app/dashboard/exercises/page.tsx
import { listExercises, syncExercisesOnLoad, listExerciseSubstituteIds } from "@/lib/actions/exercises";
import { NewExerciseButton } from "./new-exercise-button";
import { ImportExercisesButton } from "./import-exercises-button";
import { ExercisesExplorer } from "./exercises-explorer";
import { Panel } from "@/components/ui/panel";

export default async function ExercisesPage() {
  await syncExercisesOnLoad();
  const [items, substituteIdsByExercise] = await Promise.all([
    listExercises(),
    listExerciseSubstituteIds(),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Biblioteca de exercícios</h1>
        <div className="flex items-center gap-2">
          <ImportExercisesButton />
          <NewExerciseButton exerciseOptions={items} />
        </div>
      </div>

      {items.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            Nenhum exercício cadastrado ainda. Clique em <b className="text-[var(--foreground)]">Novo exercício</b> ou
            importe a biblioteca inicial em <b className="text-[var(--foreground)]">Importar da API</b>.
          </p>
        </Panel>
      ) : (
        <ExercisesExplorer items={items} substituteIdsByExercise={substituteIdsByExercise} />
      )}
    </div>
  );
}