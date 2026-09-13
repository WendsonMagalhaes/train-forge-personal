"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createPlan, deletePlan, createSubscription, deleteSubscription,
  markPaymentPaid, createGatewayCharge,
} from "@/lib/actions/finance";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { BILLING_CYCLE_OPTIONS, BILLING_CYCLE_LABEL, PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { Plus, Trash2, Link as LinkIcon, FileText } from "lucide-react";
import { PaymentsHistorySection, type PaymentHistoryRow } from "./payments-history-section";

type FormState = { error?: string; success?: boolean };

type Plan = { id: string; name: string; priceCents: number; billingCycle: string; sessionsIncluded: number | null };
type StudentOption = { id: string; name: string };
type SubscriptionRow = {
  id: string; status: string; startedAt: string; nextDueDate: string;
  studentId: string; studentName: string; planId: string; planName: string;
  priceCents: number; billingCycle: string;
  pendingPayment: { id: string; dueDate: string; amountCents: number; gatewayChargeId: string | null } | null;
  latestPaidPayment: { id: string; paidAt: Date | null } | null;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function FinanceClient({
  plans, subscriptions, studentOptions, allPayments,
}: { plans: Plan[]; subscriptions: SubscriptionRow[]; studentOptions: StudentOption[]; allPayments: PaymentHistoryRow[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const overdueCount = subscriptions.filter((s) => s.pendingPayment && isOverdue(s.pendingPayment.dueDate)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Financeiro</h1>
        {overdueCount > 0 && <Badge variant="danger">{overdueCount} pagamento(s) em atraso</Badge>}
      </div>

      <PlansSection plans={plans} onChange={refresh} />
      <SubscriptionsSection subscriptions={subscriptions} plans={plans} studentOptions={studentOptions} onChange={refresh} />
      <PaymentsHistorySection payments={allPayments} />
    </div>
  );
}

// ---------- Planos ----------
// (sem alterações nesta fase)

function PlansSection({ plans, onChange }: { plans: Plan[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Planos</PanelTitle>
        <Dialog
          size="lg"
          title="Novo plano"
          trigger={<Button size="sm"><Plus className="h-4 w-4" />Novo plano</Button>}
          open={open}
          onOpenChange={setOpen}
        >
          {() => <NewPlanForm onSuccess={() => { setOpen(false); onChange(); }} />}
        </Dialog>
      </PanelHeader>

      {plans.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nenhum plano cadastrado ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-medium">{p.name}</p>
                <ConfirmDeleteButton
                  itemLabel={p.name}
                  trigger={<button className="text-[var(--muted)] hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
                  onConfirm={async () => { await deletePlan(p.id); onChange(); }}
                />
              </div>
              <p className="text-sm text-[var(--primary)]">{formatCents(p.priceCents)}</p>
              <p className="text-xs text-[var(--muted)]">
                {BILLING_CYCLE_LABEL[p.billingCycle] ?? p.billingCycle}
                {p.sessionsIncluded ? ` · ${p.sessionsIncluded} sessões` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function NewPlanForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await createPlan(formData)) ?? {},
    undefined
  );
  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Plano criado." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Nome do plano</Label>
        <Input id="name" name="name" placeholder="Mensal Individual" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Preço (R$)</Label>
          <Input id="price" name="price" placeholder="250,00" required />
        </div>
        <div>
          <Label htmlFor="billingCycle">Ciclo</Label>
          <select
            id="billingCycle" name="billingCycle" defaultValue="monthly"
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
          >
            {BILLING_CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="sessionsIncluded">Sessões incluídas (opcional)</Label>
        <Input id="sessionsIncluded" name="sessionsIncluded" type="number" placeholder="Deixe vazio para ilimitado" />
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar plano"}</Button>
      </div>
    </form>
  );
}

// ---------- Assinaturas ----------
// (sem alterações na criação/exclusão nesta fase)

function SubscriptionsSection({
  subscriptions, plans, studentOptions, onChange,
}: { subscriptions: SubscriptionRow[]; plans: Plan[]; studentOptions: StudentOption[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Panel className="p-0">
      <div className="tf-hairline flex items-center justify-between p-5 pb-4">
        <PanelTitle>Assinaturas e pagamentos</PanelTitle>
        <Dialog
          size="lg"
          title="Nova assinatura"
          description="Vincula um aluno a um plano e gera a primeira cobrança."
          trigger={<Button size="sm"><Plus className="h-4 w-4" />Nova assinatura</Button>}
          open={open}
          onOpenChange={setOpen}
        >
          {() => (
            <NewSubscriptionForm
              plans={plans}
              studentOptions={studentOptions}
              onSuccess={() => { setOpen(false); onChange(); }}
            />
          )}
        </Dialog>
      </div>

      {subscriptions.length === 0 ? (
        <p className="p-5 text-sm text-[var(--muted)]">Nenhuma assinatura ativa ainda.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {subscriptions.map((s) => <SubscriptionRowCard key={s.id} sub={s} onChange={onChange} />)}
        </div>
      )}
    </Panel>
  );
}

function NewSubscriptionForm({
  plans, studentOptions, onSuccess,
}: { plans: Plan[]; studentOptions: StudentOption[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await createSubscription(formData)) ?? {},
    undefined
  );
  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Assinatura criada." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (plans.length === 0 || studentOptions.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Cadastre pelo menos um plano e um aluno ativo antes de criar uma assinatura.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="studentId">Aluno</Label>
        <select
          id="studentId" name="studentId" required defaultValue=""
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          <option value="" disabled>Selecione…</option>
          {studentOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="planId">Plano</Label>
        <select
          id="planId" name="planId" required defaultValue=""
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          <option value="" disabled>Selecione…</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatCents(p.priceCents)}</option>)}
        </select>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar assinatura"}</Button>
      </div>
    </form>
  );
}

function SubscriptionRowCard({ sub, onChange }: { sub: SubscriptionRow; onChange: () => void }) {
  const [markOpen, setMarkOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const overdue = sub.pendingPayment ? isOverdue(sub.pendingPayment.dueDate) : false;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="font-medium">{sub.studentName}</p>
        <p className="text-xs text-[var(--muted)]">
          {sub.planName} · {formatCents(sub.priceCents)} / {BILLING_CYCLE_LABEL[sub.billingCycle]?.toLowerCase()}
        </p>
        {sub.pendingPayment && (
          <p className={`mt-1 text-xs ${overdue ? "text-red-500" : "text-[var(--muted)]"}`}>
            Vencimento: {new Date(sub.pendingPayment.dueDate).toLocaleDateString("pt-BR")}
            {overdue && " · em atraso"}
            {sub.pendingPayment.gatewayChargeId && " · cobrança gerada"}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {sub.latestPaidPayment && (
          <a
            href={`/api/invoices/${sub.latestPaidPayment.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <FileText className="h-3.5 w-3.5" /> Recibo
          </a>
        )}

        {sub.pendingPayment && (
          <>
            <Dialog
              size="lg"
              title="Gerar cobrança (Asaas)"
              description="Cria uma cobrança real e retorna o link para enviar ao aluno."
              trigger={
                <Button size="sm" variant="secondary">
                  <LinkIcon className="h-4 w-4" /> Gerar cobrança
                </Button>
              }
              open={chargeOpen}
              onOpenChange={setChargeOpen}
            >
              {() => (
                <GenerateChargeForm
                  paymentId={sub.pendingPayment!.id}
                  amountCents={sub.pendingPayment!.amountCents}
                  onSuccess={onChange}
                />
              )}
            </Dialog>

            <Dialog
              size="lg"
              title="Registrar pagamento manual"
              trigger={<Button size="sm" variant={overdue ? "destructive" : "secondary"}>Marcar como pago</Button>}
              open={markOpen}
              onOpenChange={setMarkOpen}
            >
              {() => (
                <MarkPaidForm
                  paymentId={sub.pendingPayment!.id}
                  amountCents={sub.pendingPayment!.amountCents}
                  onSuccess={() => { setMarkOpen(false); onChange(); }}
                />
              )}
            </Dialog>
          </>
        )}
        <ConfirmDeleteButton
          itemLabel={`assinatura de ${sub.studentName}`}
          trigger={<button className="text-[var(--muted)] hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
          onConfirm={async () => { await deleteSubscription(sub.id); onChange(); }}
        />
      </div>
    </div>
  );
}

/** Gera uma cobrança real via Asaas (PIX/boleto/cartão) para um pagamento pendente. */
function GenerateChargeForm({
  paymentId, amountCents, onSuccess,
}: { paymentId: string; amountCents: number; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition();
  const [needsCpf, setNeedsCpf] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const { toast } = useToast();

  function handleSubmit(formData: FormData) {
    const method = formData.get("method") as "pix" | "boleto" | "credit_card";
    const cpf = (formData.get("cpf") as string) || undefined;

    startTransition(async () => {
      const res = await createGatewayCharge({ paymentId, method, cpf });
      if (res?.error) {
        if (res.needsCpf) setNeedsCpf(true);
        toast({ variant: "error", description: res.error });
        return;
      }
      setInvoiceUrl(res.invoiceUrl ?? null);
      toast({ variant: "success", description: "Cobrança gerada com sucesso." });
      onSuccess();
    });
  }

  if (invoiceUrl) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-[var(--muted)]">Envie este link para o aluno concluir o pagamento:</p>
        <div className="flex items-center gap-2">
          <Input readOnly value={invoiceUrl} />
          <Button
            type="button"
            size="sm"
            onClick={() => { navigator.clipboard.writeText(invoiceUrl); toast({ variant: "success", description: "Link copiado." }); }}
          >
            Copiar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-[var(--muted)]">
        Valor: <b className="text-[var(--foreground)]">{formatCents(amountCents)}</b>
      </p>
      <div>
        <Label htmlFor="method">Forma de cobrança</Label>
        <select
          id="method" name="method" defaultValue="pix"
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          <option value="pix">PIX</option>
          <option value="boleto">Boleto</option>
          <option value="credit_card">Cartão de crédito</option>
        </select>
      </div>

      {needsCpf && (
        <div>
          <Label htmlFor="cpf">CPF do aluno (primeira cobrança)</Label>
          <Input id="cpf" name="cpf" placeholder="000.000.000-00" required />
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Gerando…" : "Gerar cobrança"}</Button>
      </div>
    </form>
  );
}

/** Marcação manual — usada para dinheiro ou outros métodos fora do gateway. */
function MarkPaidForm({ paymentId, amountCents, onSuccess }: { paymentId: string; amountCents: number; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const method = new FormData(e.currentTarget).get("method") as "pix" | "credit_card" | "boleto" | "cash" | "other";
        startTransition(async () => {
          const res = await markPaymentPaid(paymentId, method);
          if (res?.error) toast({ variant: "error", description: res.error });
          else { toast({ variant: "success", description: "Pagamento registrado." }); onSuccess(); }
        });
      }}
    >
      <p className="text-sm text-[var(--muted)]">Valor: <b className="text-[var(--foreground)]">{formatCents(amountCents)}</b></p>
      <div>
        <Label htmlFor="method">Forma de pagamento</Label>
        <select
          id="method" name="method" defaultValue="pix"
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          {PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Registrando…" : "Confirmar pagamento"}</Button>
      </div>
    </form>
  );
}
