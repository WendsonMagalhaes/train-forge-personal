import { listWorkoutTemplates } from "@/lib/actions/workout-templates";
import { listExercises } from "@/lib/actions/exercises";
import { TemplatesClient } from "./templates-client";

export default async function TreinosProntosPage() {
  const [templates, exerciseLibrary] = await Promise.all([listWorkoutTemplates(), listExercises()]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl">Treinos prontos</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Monte treinos separados, como Tríceps ou Peito, e adicione-os às fichas dos alunos com um clique.
        </p>
      </div>

      <TemplatesClient templates={templates} exerciseLibrary={exerciseLibrary} />
    </div>
  );
}
