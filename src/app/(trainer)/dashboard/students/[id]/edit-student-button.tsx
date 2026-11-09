"use client";

import { useActionState, useEffect, useState } from "react";
import { updateStudent } from "@/lib/actions/students";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { STUDENT_GOAL_OPTIONS } from "@/lib/constants";
import { toDisplayText } from "@/lib/text-case";
import { useToast } from "@/components/ui/toast";
import { Pencil } from "lucide-react";

export type EditableStudent = {
  name: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  goals: string[] | null;
};

type FormState = { error?: string; success?: boolean };

export function EditStudentButton({ studentId, student }: { studentId: string; student: EditableStudent }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      title="Editar aluno"
      description="Altere os dados de cadastro. O e-mail é o login do aluno no portal."
      trigger={
        <button
          type="button"
          aria-label="Editar dados do aluno"
          className="tf-tap flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--primary)]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => <EditStudentForm studentId={studentId} student={student} onSuccess={() => setOpen(false)} />}
    </Dialog>
  );
}

function EditStudentForm({
  studentId, student, onSuccess,
}: { studentId: string; student: EditableStudent; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await updateStudent(studentId, formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Dados do aluno atualizados." });
      onSuccess();
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="edit-name">Nome completo</Label>
        <Input id="edit-name" name="name" defaultValue={toDisplayText(student.name)} required />
      </div>
      <div>
        <Label htmlFor="edit-email">E-mail</Label>
        <Input id="edit-email" name="email" type="email" defaultValue={student.email} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-phone">Telefone</Label>
          <Input id="edit-phone" name="phone" inputMode="tel" defaultValue={student.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="edit-birth">Nascimento</Label>
          <Input id="edit-birth" name="birthDate" type="date" defaultValue={student.birthDate ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="edit-gender">Gênero</Label>
        <Input id="edit-gender" name="gender" defaultValue={toDisplayText(student.gender)} />
      </div>
      <div>
        <Label>Objetivos</Label>
        <MultiSelect
          name="goals"
          options={STUDENT_GOAL_OPTIONS}
          defaultValue={student.goals ?? []}
          placeholder="Selecione um ou mais objetivos"
        />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
