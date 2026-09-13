"use client";

import { useActionState, useEffect, useState } from "react";
import { createExercise } from "@/lib/actions/exercises";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, type MuscleGroup } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FileUpload } from "@/components/ui/file-upload";
import { MultiSelect } from "@/components/ui/multi-select";

type ExerciseOption = { id: string; name: string; muscleGroup: string };

export function NewExerciseForm({
  onSuccess,
  exerciseOptions = [],
}: {
  onSuccess: () => void;
  /** Biblioteca atual do personal, pra oferecer como substitutos (filtrados pelo grupo muscular escolhido). */
  exerciseOptions?: ExerciseOption[];
}) {
  const { toast } = useToast();
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0]);
  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await createExercise(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Exercício adicionado à biblioteca." });
      onSuccess();
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="muscleGroup">Grupo muscular</Label>
        <select
          id="muscleGroup"
          name="muscleGroup"
          required
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>{MUSCLE_GROUP_LABEL[g]}</option>
          ))}
        </select>
      </div>
      {exerciseOptions.length > 0 && (
        <div>
          <Label>Exercícios substitutos (opcional)</Label>
          <MultiSelect
            name="substituteIds"
            placeholder="Exercícios que trabalham os mesmos músculos…"
            options={exerciseOptions
              .filter((ex) => ex.muscleGroup === muscleGroup)
              .map((ex) => ({ label: ex.name, value: ex.id }))}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            Mostra só exercícios já cadastrados do mesmo grupo muscular selecionado acima.
          </p>
        </div>
      )}
      <div>
        <Label htmlFor="equipment">Equipamento</Label>
        <Input id="equipment" name="equipment" placeholder="Barra, halteres, máquina…" />
      </div>
      <FileUpload
        name="videoUrl"
        label="Vídeo do exercício (opcional)"
        kind="exercise-video"
        accept="video/mp4,video/quicktime,video/webm"
        preview="video"
      />
      <FileUpload
        name="imageUrl"
        label="Foto do exercício (opcional)"
        kind="exercise-image"
        accept="image/png,image/jpeg,image/webp"
        preview="image"
      />
      <div>
        <Label htmlFor="instructions">Instruções de execução</Label>
        <textarea
          id="instructions"
          name="instructions"
          rows={3}
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Adicionar à biblioteca"}</Button>
      </div>
    </form>
  );
}