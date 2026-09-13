"use client";

import { useActionState, useEffect } from "react";
import { saveHealthHistory } from "@/lib/actions/students";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Health = {
  hasInjuries: boolean | null;
  injuriesDetail: string | null;
  hasChronicConditions: boolean | null;
  chronicConditionsDetail: string | null;
  medications: string | null;
  medicalRestrictions: string | null;
  medicalClearance: boolean | null;
} | null;

export function HealthHistoryForm({ studentId, current }: { studentId: string; current: Health }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | undefined, formData: FormData) => {
      return (await saveHealthHistory(studentId, formData)) ?? {};
    },
    undefined
  );

  useEffect(() => {
    if (state?.success) toast({ variant: "success", description: "Anamnese salva." });
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hasInjuries" defaultChecked={!!current?.hasInjuries} />
        Possui lesões (atuais ou histórico)
      </label>
      <div>
        <Label htmlFor="injuriesDetail">Detalhes das lesões</Label>
        <Input id="injuriesDetail" name="injuriesDetail" defaultValue={current?.injuriesDetail ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hasChronicConditions" defaultChecked={!!current?.hasChronicConditions} />
        Possui condições crônicas (hipertensão, diabetes, etc.)
      </label>
      <div>
        <Label htmlFor="chronicConditionsDetail">Detalhes das condições</Label>
        <Input id="chronicConditionsDetail" name="chronicConditionsDetail" defaultValue={current?.chronicConditionsDetail ?? ""} />
      </div>

      <div>
        <Label htmlFor="medications">Medicações em uso</Label>
        <Input id="medications" name="medications" defaultValue={current?.medications ?? ""} />
      </div>

      <div>
        <Label htmlFor="medicalRestrictions">Restrições médicas</Label>
        <Input id="medicalRestrictions" name="medicalRestrictions" defaultValue={current?.medicalRestrictions ?? ""} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="medicalClearance" defaultChecked={!!current?.medicalClearance} />
        Possui atestado / liberação médica para exercícios
      </label>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar anamnese"}
      </Button>
    </form>
  );
}
