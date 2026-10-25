"use client";
import { NumberInput } from "@/components/ui/number-input";

import { useActionState, useEffect } from "react";
import { createAssessment } from "@/lib/actions/assessments";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FileUpload } from "@/components/ui/file-upload";

type FormState = { error?: string; success?: boolean };

export function NewAssessmentForm({ studentId, onSuccess }: { studentId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await createAssessment(studentId, formData)) ?? {},
    undefined
  );
  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Avaliação registrada." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="assessedAt">Data da avaliação</Label>
        <Input id="assessedAt" name="assessedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="weightKg">Peso (kg)</Label><NumberInput id="weightKg" name="weightKg" /></div>
        <div><Label htmlFor="heightCm">Altura (cm)</Label><NumberInput id="heightCm" name="heightCm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="bodyFatPct">% Gordura</Label><NumberInput id="bodyFatPct" name="bodyFatPct" /></div>
        <div><Label htmlFor="muscleMassKg">Massa magra (kg)</Label><NumberInput id="muscleMassKg" name="muscleMassKg" /></div>
      </div>

      <p className="text-xs font-medium text-[var(--muted)]">Circunferências (cm)</p>
      <div className="grid grid-cols-3 gap-3">
        <div><Label htmlFor="waistCm">Cintura</Label><NumberInput id="waistCm" name="waistCm" /></div>
        <div><Label htmlFor="hipCm">Quadril</Label><NumberInput id="hipCm" name="hipCm" /></div>
        <div><Label htmlFor="chestCm">Peito</Label><NumberInput id="chestCm" name="chestCm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="armRightCm">Braço D.</Label><NumberInput id="armRightCm" name="armRightCm" /></div>
        <div><Label htmlFor="armLeftCm">Braço E.</Label><NumberInput id="armLeftCm" name="armLeftCm" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor="thighRightCm">Coxa D.</Label><NumberInput id="thighRightCm" name="thighRightCm" /></div>
        <div><Label htmlFor="thighLeftCm">Coxa E.</Label><NumberInput id="thighLeftCm" name="thighLeftCm" /></div>
      </div>

      <p className="text-xs font-medium text-[var(--muted)]">Fotos de evolução (opcional)</p>
      <div className="grid grid-cols-3 gap-3">
        <FileUpload name="photoFrontUrl" label="Frente" kind="assessment-photo" accept="image/png,image/jpeg,image/webp" preview="image" camera guide="front" />
        <FileUpload name="photoSideUrl" label="Lado" kind="assessment-photo" accept="image/png,image/jpeg,image/webp" preview="image" camera guide="side" />
        <FileUpload name="photoBackUrl" label="Costas" kind="assessment-photo" accept="image/png,image/jpeg,image/webp" preview="image" camera guide="back" />
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <textarea
          id="notes" name="notes" rows={2}
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar avaliação"}</Button>
      </div>
    </form>
  );
}