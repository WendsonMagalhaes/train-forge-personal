"use client";

import { useActionState, useEffect, useState } from "react";
import { createStudent } from "@/lib/actions/students";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { STUDENT_GOAL_OPTIONS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";
import { Copy, Check } from "lucide-react";

type CreateStudentState = {
  error?: string;
  success?: boolean;
  credentials?: { email: string; tempPassword: string };
};

export function NewStudentForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<CreateStudentState | undefined, FormData>(
    async (_prev, formData) => (await createStudent(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.error]);

  // Depois de cadastrado, mostra a senha provisória uma única vez — não fecha
  // o modal sozinho, pra dar tempo do personal copiar/anotar antes de repassar ao aluno.
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div>
          <Label htmlFor="birthDate">Nascimento</Label>
          <Input id="birthDate" name="birthDate" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="gender">Gênero</Label>
        <Input id="gender" name="gender" />
      </div>
      <div>
        <Label>Objetivos</Label>
        <MultiSelect name="goals" options={STUDENT_GOAL_OPTIONS} placeholder="Selecione um ou mais objetivos" />
      </div>

      <p className="text-xs text-[var(--muted)]">
        Uma senha temporária é gerada automaticamente para o aluno acessar o portal. No primeiro
        login, ele será obrigado a trocá-la.
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar aluno"}
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
    const text = `Acesso ao portal Train Forge\nE-mail: ${credentials.email}\nSenha provisória: ${credentials.tempPassword}`;
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
        Aluno cadastrado! Repasse esses dados de acesso a ele — a senha só aparece{" "}
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

      <p className="text-xs text-[var(--muted)]">
        No primeiro acesso, o aluno será obrigado a definir uma nova senha antes de usar o portal.
      </p>

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
