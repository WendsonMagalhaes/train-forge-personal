"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setExerciseSubstitutes } from "@/lib/actions/exercises";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/components/ui/toast";
import { Repeat } from "lucide-react";

type ExerciseOption = { id: string; name: string; muscleGroup: string };

export function ManageSubstitutesButton({
  exerciseId,
  muscleGroup,
  exerciseOptions,
  currentSubstituteIds,
}: {
  exerciseId: string;
  muscleGroup: string;
  /** Biblioteca completa do personal (exclui o próprio exercício antes de exibir). */
  exerciseOptions: ExerciseOption[];
  currentSubstituteIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const options = exerciseOptions
    .filter((ex) => ex.id !== exerciseId && ex.muscleGroup === muscleGroup)
    .map((ex) => ({ label: ex.name, value: ex.id }));

  return (
    <Dialog
      size="md"
      title="Exercícios substitutos"
      description="Exercícios que trabalham os mesmos músculos e podem substituir esse na ficha (falta de equipamento, variação, etc.)."
      trigger={
        <button
          type="button"
          className="text-[var(--muted)] transition-colors hover:text-[var(--primary)]"
          title="Gerenciar substitutos"
        >
          <Repeat className="h-4 w-4" />
        </button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <ManageSubstitutesForm
          exerciseId={exerciseId}
          options={options}
          currentSubstituteIds={currentSubstituteIds}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </Dialog>
  );
}

function ManageSubstitutesForm({
  exerciseId,
  options,
  currentSubstituteIds,
  onSuccess,
}: {
  exerciseId: string;
  options: { label: string; value: string }[];
  currentSubstituteIds: string[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const action = setExerciseSubstitutes.bind(null, exerciseId);
  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await action(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Substitutos atualizados." });
      onSuccess();
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {options.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Não há outros exercícios do mesmo grupo muscular na sua biblioteca ainda. Cadastre mais exercícios pra
          poder indicá-los aqui como substitutos.
        </p>
      ) : (
        <MultiSelect
          name="substituteIds"
          options={options}
          defaultValue={currentSubstituteIds}
          placeholder="Selecione os exercícios substitutos…"
        />
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar substitutos"}</Button>
      </div>
    </form>
  );
}
