"use client";

import { useState, useTransition } from "react";
import { resetUserPassword } from "@/lib/actions/admin";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { KeyRound, Copy, Check } from "lucide-react";

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTempPassword(null); // não deixa a senha "vazando" na próxima abertura
  }

  function generate() {
    startTransition(async () => {
      const result = await resetUserPassword(userId);
      if (result?.tempPassword) {
        setTempPassword(result.tempPassword);
      } else {
        toast({ variant: "error", description: "Não foi possível gerar a nova senha." });
      }
    });
  }

  async function copy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast({ variant: "success", description: "Senha copiada." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "error", description: "Não foi possível copiar. Copie manualmente." });
    }
  }

  return (
    <Dialog
      title="Resetar senha"
      description={`Gera uma nova senha provisória para ${name}.`}
      trigger={
        <Button variant="ghost" size="icon" title="Resetar senha">
          <KeyRound className="h-4 w-4" />
        </Button>
      }
      open={open}
      onOpenChange={handleOpenChange}
    >
      {(close) =>
        tempPassword ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--muted)]">
              Repasse a nova senha a <b className="text-[var(--foreground)]">{name}</b> — ela só
              aparece <b className="text-[var(--foreground)]">esta única vez</b>. No próximo login,
              a troca de senha será obrigatória.
            </p>
            <div className="tf-panel border border-[var(--border)] p-4">
              <Label>Nova senha provisória</Label>
              <p className="font-mono text-lg tracking-wide">{tempPassword}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button type="button" onClick={close}>Concluir</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--muted)]">
              Isso invalida a senha atual de <b className="text-[var(--foreground)]">{name}</b> e
              gera uma nova senha provisória. Deseja continuar?
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={close}>Cancelar</Button>
              <Button type="button" disabled={pending} onClick={generate}>
                {pending ? "Gerando…" : "Gerar nova senha"}
              </Button>
            </div>
          </div>
        )
      }
    </Dialog>
  );
}
