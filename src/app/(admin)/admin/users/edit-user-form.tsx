"use client";

import { useActionState, useEffect, useState } from "react";
import { updateUser } from "@/lib/actions/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { USER_ROLE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";

type TrainerOption = { id: string; name: string; email: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "trainer" | "student";
  trainerId: string | null;
};

export function EditUserForm({
  user,
  trainerOptions,
  onSuccess,
}: {
  user: UserRow;
  trainerOptions: TrainerOption[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [role, setRole] = useState(user.role);
  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await updateUser(user.id, formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Usuário atualizado." });
      onSuccess();
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" name="name" defaultValue={user.name} required />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={user.email} required />
      </div>
      <div>
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRow["role"])}
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          {USER_ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {role === "student" && (
        <div>
          <Label htmlFor="trainerId">Personal responsável</Label>
          <select
            id="trainerId"
            name="trainerId"
            required
            defaultValue={user.trainerId ?? ""}
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
          >
            <option value="" disabled>Selecione…</option>
            {trainerOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
