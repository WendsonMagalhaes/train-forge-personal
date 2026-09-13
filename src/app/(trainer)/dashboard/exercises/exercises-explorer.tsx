// app/(trainer)/dashboard/exercises/exercises-explorer.tsx
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, type MuscleGroup } from "@/lib/constants";
import { DeleteExerciseButton } from "./delete-button";
import { ManageSubstitutesButton } from "./manage-substitutes-button";
import { Dumbbell, Search } from "lucide-react";

type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  muscleGroupDetail: string | null;
  secondaryMuscles: string[] | null;
  category: string | null;
  movementPattern: string | null;
  equipment: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  instructions: string | null;
  source: string;
};

export function ExercisesExplorer({
  items,
  substituteIdsByExercise = {},
}: {
  items: Exercise[];
  /** Mapa exerciseId -> ids dos substitutos cadastrados (ver `listExerciseSubstituteIds`). */
  substituteIdsByExercise?: Record<string, string[]>;
}) {
  const [query, setQuery] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "">("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((ex) => {
      const matchesQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        (ex.muscleGroupDetail ?? "").toLowerCase().includes(q) ||
        (ex.equipment ?? "").toLowerCase().includes(q);
      const matchesGroup = !muscleGroup || ex.muscleGroup === muscleGroup;
      return matchesQuery && matchesGroup;
    });
  }, [items, query, muscleGroup]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, músculo ou equipamento…"
            className="pl-9"
          />
        </div>
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup | "")}
          className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)] sm:w-56"
        >
          <option value="">Todos os grupos musculares</option>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>{MUSCLE_GROUP_LABEL[g]}</option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-xs text-[var(--muted)]">
        {filtered.length} de {items.length} exercício(s)
      </p>

      {filtered.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">Nenhum exercício encontrado com esse filtro.</p>
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              allExercises={items}
              substituteIds={substituteIdsByExercise[ex.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise: ex,
  allExercises,
  substituteIds,
}: {
  exercise: Exercise;
  allExercises: Exercise[];
  substituteIds: string[];
}) {
  return (
    <Dialog
      title={ex.name}
      description={MUSCLE_GROUP_LABEL[ex.muscleGroup as MuscleGroup]}
      trigger={
        <Panel className="flex cursor-pointer flex-col gap-3 transition-colors hover:border-[var(--tf-ember)]">
          <div className="flex items-start gap-3">
            {ex.imageUrl || ex.videoUrl ? (
              ex.videoUrl && ex.videoUrl.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={ex.videoUrl}
                  poster={ex.imageUrl ?? undefined}
                  className="h-16 w-16 shrink-0 rounded-[var(--radius)] object-cover"
                  muted
                  loop
                  playsInline
                  autoPlay
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ex.imageUrl ?? ex.videoUrl ?? ""} alt={ex.name} className="h-16 w-16 shrink-0 rounded-[var(--radius)] object-cover" />
              )
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--background)]">
                <Dumbbell className="h-6 w-6 text-[var(--muted)]" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{ex.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="outline">{MUSCLE_GROUP_LABEL[ex.muscleGroup as MuscleGroup]}</Badge>
                {ex.source === "api" && <Badge variant="secondary">API</Badge>}
                {substituteIds.length > 0 && (
                  <Badge variant="secondary">
                    {substituteIds.length} substituto{substituteIds.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* stopPropagation pra ações rápidas não abrirem o modal de detalhe junto */}
            <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-2">
              <ManageSubstitutesButton
                exerciseId={ex.id}
                muscleGroup={ex.muscleGroup}
                exerciseOptions={allExercises}
                currentSubstituteIds={substituteIds}
              />
              <DeleteExerciseButton id={ex.id} name={ex.name} />
            </div>
          </div>

          <div className="flex flex-col gap-1 text-xs text-[var(--muted)]">
            {ex.muscleGroupDetail && <p>Músculo principal: {ex.muscleGroupDetail}</p>}
            {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
              <p>Secundários: {ex.secondaryMuscles.join(", ")}</p>
            )}
            {ex.movementPattern && <p>Padrão de movimento: {ex.movementPattern}</p>}
            {ex.equipment && <p>Equipamento: {ex.equipment}</p>}
          </div>

          <span className="text-xs text-[var(--primary)]">Ver detalhes</span>
        </Panel>
      }
    >
      {() => (
        <ExerciseDetail
          exercise={ex}
          substitutes={allExercises.filter((o) => substituteIds.includes(o.id))}
        />
      )}
    </Dialog>
  );
}

function ExerciseDetail({ exercise: ex, substitutes }: { exercise: Exercise; substitutes: Exercise[] }) {
  const isVideoFile = !!ex.videoUrl && /\.(mp4|webm|mov)$/i.test(ex.videoUrl);

  return (
    <div className="flex flex-col gap-4">
      {(ex.videoUrl || ex.imageUrl) && (
        <div className="overflow-hidden rounded-[var(--radius)] bg-[var(--background)]">
          {isVideoFile ? (
            <video
              src={ex.videoUrl!}
              poster={ex.imageUrl ?? undefined}
              className="w-full"
              controls
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ex.imageUrl ?? ex.videoUrl ?? ""} alt={ex.name} className="w-full object-contain" />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline">{MUSCLE_GROUP_LABEL[ex.muscleGroup as MuscleGroup]}</Badge>
        {ex.source === "api" && <Badge variant="secondary">API</Badge>}
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {ex.muscleGroupDetail && (
          <div>
            <dt className="text-xs text-[var(--muted)]">Músculo principal</dt>
            <dd>{ex.muscleGroupDetail}</dd>
          </div>
        )}
        {ex.secondaryMuscles && ex.secondaryMuscles.length > 0 && (
          <div>
            <dt className="text-xs text-[var(--muted)]">Músculos secundários</dt>
            <dd>{ex.secondaryMuscles.join(", ")}</dd>
          </div>
        )}
        {ex.movementPattern && (
          <div>
            <dt className="text-xs text-[var(--muted)]">Padrão de movimento</dt>
            <dd>{ex.movementPattern}</dd>
          </div>
        )}
        {ex.equipment && (
          <div>
            <dt className="text-xs text-[var(--muted)]">Equipamento</dt>
            <dd>{ex.equipment}</dd>
          </div>
        )}
      </dl>

      {ex.instructions && (
        <div>
          <p className="mb-1 text-xs text-[var(--muted)]">Instruções</p>
          <p className="whitespace-pre-line text-sm">{ex.instructions}</p>
        </div>
      )}

      {substitutes.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-[var(--muted)]">Exercícios substitutos</p>
          <div className="flex flex-col gap-1.5">
            {substitutes.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2 rounded-[var(--radius)] bg-[var(--background)] p-2 text-sm">
                {sub.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.imageUrl} alt={sub.name} className="h-8 w-8 shrink-0 rounded-[var(--radius)] object-cover" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--surface)]">
                    <Dumbbell className="h-3.5 w-3.5 text-[var(--muted)]" />
                  </span>
                )}
                <span className="truncate">{sub.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}