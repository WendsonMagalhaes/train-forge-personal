"use client";

import { useActionState, useEffect } from "react";
import { createExerciseAdmin, updateExerciseAdmin } from "@/lib/actions/admin";
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABEL } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FileUpload } from "@/components/ui/file-upload";

type TrainerOption = { id: string; name: string; email: string };
type ExerciseRow = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  videoUrl: string | null;
  imageUrl?: string | null;
  trainerId: string;
};

export function ExerciseForm({
  trainerOptions,
  exercise,
  onSuccess,
}: {
  trainerOptions: TrainerOption[];
  exercise?: ExerciseRow;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const action = exercise ? updateExerciseAdmin.bind(null, exercise.id) : createExerciseAdmin;
  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await action(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: exercise ? "Exercício atualizado." : "Exercício criado." });
      onSuccess();
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div>
        <Label htmlFor="trainerId">Personal dono do exercício</Label>
        <select
          id="trainerId"
          name="trainerId"
          required
          defaultValue={exercise?.trainerId ?? ""}
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          <option value="" disabled>Selecione…</option>
          {trainerOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={exercise?.name} required />
      </div>
      <div>
        <Label htmlFor="muscleGroup">Grupo muscular</Label>
        <select
          id="muscleGroup"
          name="muscleGroup"
          required
          defaultValue={exercise?.muscleGroup ?? MUSCLE_GROUPS[0]}
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>{MUSCLE_GROUP_LABEL[g]}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="equipment">Equipamento</Label>
        <Input id="equipment" name="equipment" defaultValue={exercise?.equipment ?? ""} placeholder="Barra, halteres, máquina…" />
      </div>
      <FileUpload
        name="videoUrl"
        label="Vídeo do exercício (opcional)"
        kind="exercise-video"
        accept="video/mp4,video/quicktime,video/webm"
        preview="video"
        defaultValue={exercise?.videoUrl}
      />
      <FileUpload
        name="imageUrl"
        label="Foto do exercício (opcional)"
        kind="exercise-image"
        accept="image/png,image/jpeg,image/webp"
        preview="image"
        defaultValue={exercise?.imageUrl}
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : exercise ? "Salvar alterações" : "Criar exercício"}
        </Button>
      </div>
    </form>
  );
}