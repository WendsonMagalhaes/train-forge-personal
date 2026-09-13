"use client";

import { useActionState, useEffect, useState } from "react";
import { createUser } from "@/lib/actions/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { USER_ROLE_OPTIONS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import { Copy, Check } from "lucide-react";

type TrainerOption = { id: string; name: string; email: string };

type CreateUserState = {
  error?: string;
  success?: boolean;
  credentials?: { email: string; tempPassword: string };
};

export function NewUserForm({
  trainerOptions,
  onSuccess,
}: {
  trainerOptions: TrainerOption[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [role, setRole] = useState<string>("trainer");
  const [state, formAction, pending] = useActionState<CreateUserState | undefined, FormData>(
    async (_prev, formData) => (await createUser(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.error]);

  if (state?.success && state.credentials) {
    return <CredentialsReveal credentials={state.credentials} onDone={onSuccess} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="role">Papel</Label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
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
            defaultValue=""
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
          >
            <option value="" disabled>Selecione…</option>
            {trainerOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
            ))}
          </select>
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        Uma senha provisória é gerada automaticamente. O usuário será obrigado a trocá-la no
        primeiro login.
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Criar usuário"}
        </Button>
      </div>
    </form>
  );
}

function CredentialsReveal({
  credentials,
  onDone,
}: {
  credentials: { email: string; tempPassword: string };
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    const text = `Acesso ao Train Forge\nE-mail: ${credentials.email}\nSenha provisória: ${credentials.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ variant: "success", description: "Credenciais copiadas." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "error", description: "Não foi possível copiar. Copie manualmente." });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--muted)]">
        Usuário criado! Repasse esses dados de acesso a ele — a senha só aparece{" "}
        <b className="text-[var(--foreground)]">esta única vez</b>.
      </p>

      <div className="tf-panel flex flex-col gap-3 border border-[var(--border)] p-4">
        <div>
          <Label>E-mail</Label>
          <p className="font-mono text-sm">{credentials.email}</p>
        </div>
        <div>
          <Label>Senha provisória</Label>
          <p className="font-mono text-lg tracking-wide">{credentials.tempPassword}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={copyAll}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar credenciais"}
        </Button>
        <Button type="button" onClick={onDone}>
          Concluir
        </Button>
      </div>
    </div>
  );
}
