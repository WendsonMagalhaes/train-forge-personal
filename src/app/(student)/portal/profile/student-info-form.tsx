"use client";

import { useActionState, useEffect } from "react";
import { updateMyStudentInfo } from "@/lib/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/components/ui/toast";
import { STUDENT_GOAL_OPTIONS } from "@/lib/constants";

type Student = {
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  goals: string[] | null;
};

export function StudentInfoForm({ student }: { student: Student }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await updateMyStudentInfo(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.success) toast({ variant: "success", description: "Dados atualizados." });
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={student.phone ?? ""} placeholder="(00) 00000-0000" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birthDate">Nascimento</Label>
          <Input id="birthDate" name="birthDate" type="date" defaultValue={student.birthDate ?? ""} />
        </div>
        <div>
          <Label htmlFor="gender">Gênero</Label>
          <Input id="gender" name="gender" defaultValue={student.gender ?? ""} placeholder="Opcional" />
        </div>
      </div>
      <div>
        <Label>Objetivos</Label>
        <MultiSelect name="goals" options={STUDENT_GOAL_OPTIONS} defaultValue={student.goals ?? []} />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar dados"}
      </Button>
    </form>
  );
}
