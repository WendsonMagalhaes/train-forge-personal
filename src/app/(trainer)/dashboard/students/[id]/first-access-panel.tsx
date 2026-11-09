"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { Collapsible } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { regenerateStudentPassword } from "@/lib/actions/students";
import { buildWelcomeMessage, buildWhatsappUrl } from "@/lib/whatsapp";
import { toDisplayText } from "@/lib/text-case";
import { Check, Copy, RefreshCw, Send } from "lucide-react";

export type FirstAccessInfo = {
  name: string;
  email: string;
  phone: string | null;
  pending: boolean;
  password: string | null;
  firstAccessAt: string | null;
};

export function FirstAccessPanel({ studentId, initial }: { studentId: string; initial: FirstAccessInfo }) {
  const { toast } = useToast();
  const [info, setInfo] = useState(initial);
  const [message, setMessage] = useState(() =>
    initial.password ? buildWelcomeMessage({ name: initial.name, email: initial.email, password: initial.password }) : ""
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doneAt = info.firstAccessAt
    ? new Date(info.firstAccessAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const confirmText =
    info.pending && info.password
      ? "A senha atual deixa de funcionar. Gerar uma nova senha provisória para este aluno?"
      : "Gerar uma nova senha provisória para este aluno?";

  async function regenerate(close: () => void) {
    setBusy(true);
    try {
      const res = await regenerateStudentPassword(studentId);
      close();
      if (!("credentials" in res) || !res.credentials) {
        toast({ variant: "error", description: "error" in res ? res.error : "Não foi possível gerar a senha." });
        return;
      }
      const { email, tempPassword } = res.credentials;
      setInfo((prev) => ({ ...prev, email, pending: true, password: tempPassword, firstAccessAt: prev.firstAccessAt }));
      setMessage(buildWelcomeMessage({ name: info.name, email, password: tempPassword }));
      toast({ variant: "success", description: "Nova senha provisória gerada." });
    } catch {
      close();
      toast({ variant: "error", description: "Não foi possível gerar a senha. Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast({ variant: "success", description: "Mensagem copiada." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "error", description: "Não foi possível copiar. Selecione o texto e copie manualmente." });
    }
  }

  return (
    <Panel>
      <Collapsible
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-display text-lg">Primeiro acesso</span>
            {info.pending ? <Badge variant="warning">Aguardando</Badge> : <Badge variant="success">Concluído</Badge>}
          </span>
        }
        actions={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            aria-label="Gerar nova senha"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Gerar nova senha</span>
          </Button>
        }
      >


      {!info.pending && (
        <p className="text-sm text-[var(--muted)]">
          {toDisplayText(info.name)} já definiu a própria senha
          {doneAt ? ` em ${doneAt}` : ""}. As credenciais provisórias não ficam mais disponíveis aqui.
        </p>
      )}

      {info.pending && !info.password && (
        <p className="text-sm text-[var(--muted)]">
          A senha provisória deste aluno não ficou guardada (cadastro feito antes desta atualização).
          Gere uma nova senha para repassar a ele.
        </p>
      )}

      {info.pending && info.password && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--muted)]">
            {toDisplayText(info.name)} ainda não fez o primeiro acesso. Envie os dados abaixo pelo WhatsApp.
          </p>

          <div className="tf-panel grid gap-3 border border-[var(--border)] p-4 sm:grid-cols-2">
            <div>
              <Label>E-mail</Label>
              <p className="break-all font-mono text-sm">{info.email}</p>
            </div>
            <div>
              <Label>Senha provisória</Label>
              <p className="font-mono text-lg tracking-wide">{info.password}</p>
            </div>
          </div>

          <div>
            <Label htmlFor={`welcome-${studentId}`}>Mensagem de boas-vindas (pode editar antes de enviar)</Label>
            <textarea
              id={`welcome-${studentId}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="mt-1.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-transparent p-3 text-sm leading-relaxed focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {!info.phone && (
            <p className="text-xs text-[var(--muted)]">
              Telefone não cadastrado: o WhatsApp vai pedir para você escolher o contato.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={copyMessage}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar mensagem"}
            </Button>
            <a
              href={buildWhatsappUrl(info.phone, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="tf-tap inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[#25D366] px-4 text-sm font-medium text-white transition-[filter] hover:brightness-110"
            >
              <Send className="h-4 w-4" />
              Enviar no WhatsApp
            </a>
          </div>
        </div>
      )}
      </Collapsible>

      <Dialog
        title="Gerar nova senha"
        description={confirmText}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        size="sm"
      >
        {(close) => (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => regenerate(close)} disabled={busy}>
              {busy ? "Gerando…" : "Gerar senha"}
            </Button>
          </div>
        )}
      </Dialog>
    </Panel>
  );
}
