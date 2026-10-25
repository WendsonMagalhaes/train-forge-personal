"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createPlan, updatePlan, deletePlan, createSubscription, deleteSubscription,
  markPaymentPaid, createGatewayCharge, updateSubscriptionDueDate,
} from "@/lib/actions/finance";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { BILLING_CYCLE_OPTIONS, BILLING_CYCLE_LABEL, PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { Plus, Trash2, Pencil, Link as LinkIcon, FileText, Info } from "lucide-react";
import { formatDateOnly, dateInSaoPaulo } from "@/lib/dates";
import { PaymentsHistorySection, type PaymentHistoryRow } from "./payments-history-section";

type FormState = { error?: string; success?: boolean };

type Plan = { id: string; name: string; priceCents: number; billingCycle: string; sessionsIncluded: number | null };
type StudentOption = { id: string; name: string };
type SubscriptionRow = {
  id: string; status: string; startedAt: string; nextDueDate: string;
  studentId: string; studentName: string; planId: string; planName: string;
  priceCents: number; billingCycle: string;
  pendingPayment: { id: string; dueDate: string; amountCents: number; gatewayChargeId: string | null; status: string; method: string | null } | null;
  latestPaidPayment: { id: string; paidAt: Date | null } | null;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isOverdue(dueDate: string) {
  // yyyy-mm-dd compara lexicograficamente: sem conversão de fuso
  return dueDate < dateInSaoPaulo();
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
                <div className="flex items-center gap-2">
                <EditPlanDialog plan={p} onChange={onChange} />
                <ConfirmDeleteButton
                  itemLabel={p.name}
                  trigger={<button className="text-[var(--muted)] hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
                  onConfirm={async () => { await deletePlan(p.id); onChange(); }}
                />
                </div>
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

function EditPlanDialog({ plan, onChange }: { plan: Plan; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      size="lg"
      title="Editar plano"
      description="Mudanças de preço valem para as próximas cobranças ainda não enviadas ao Asaas."
      trigger={<button className="text-[var(--muted)] hover:text-[var(--foreground)]" type="button" aria-label="Editar plano"><Pencil className="h-4 w-4" /></button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => <EditPlanForm plan={plan} onSuccess={() => { setOpen(false); onChange(); }} />}
    </Dialog>
  );
}

function EditPlanForm({ plan, onSuccess }: { plan: Plan; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await updatePlan(plan.id, formData)) ?? {},
    undefined
  );
  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Plano atualizado." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor={`edit-name-${plan.id}`}>Nome do plano</Label>
        <Input id={`edit-name-${plan.id}`} name="name" defaultValue={plan.name} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`edit-price-${plan.id}`}>Preço (R$)</Label>
          <NumberInput
            id={`edit-price-${plan.id}`}
            name="price"
            defaultValue={(plan.priceCents / 100).toFixed(2).replace(".", ",")}
            required
          />
        </div>
        <div>
          <Label htmlFor={`edit-cycle-${plan.id}`}>Ciclo</Label>
          <select
            id={`edit-cycle-${plan.id}`} name="billingCycle" defaultValue={plan.billingCycle}
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
          >
            {BILLING_CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor={`edit-sessions-${plan.id}`}>Sessões incluídas (opcional)</Label>
        <Input
          id={`edit-sessions-${plan.id}`} name="sessionsIncluded" type="number"
          defaultValue={plan.sessionsIncluded ?? ""} placeholder="Deixe vazio para ilimitado"
        />
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar plano"}</Button>
      </div>
    </form>
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
          <NumberInput id="price" name="price" placeholder="250,00" required />
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const pending = sub.pendingPayment;
  const overdue = pending ? isOverdue(pending.dueDate) : false;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="font-medium">{sub.studentName}</p>
        <p className="text-xs text-[var(--muted)]">
          {sub.planName} · {formatCents(sub.priceCents)} / {BILLING_CYCLE_LABEL[sub.billingCycle]?.toLowerCase()}
        </p>
        <p className={`mt-1 text-xs ${overdue ? "text-red-500" : "text-[var(--muted)]"}`}>
          Próximo vencimento: {formatDateOnly(sub.nextDueDate)}
          {pending && (
            <> · cobrança de {formatDateOnly(pending.dueDate)} {overdue ? "· em atraso" : "· pendente"}</>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

        <Dialog
          size="lg"
          title="Detalhes da assinatura"
          description={sub.studentName}
          trigger={<Button size="sm" variant="secondary"><Info className="h-4 w-4" /> Detalhes</Button>}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        >
          {() => (
            <SubscriptionDetails
              sub={sub}
              onSaved={() => { setDetailsOpen(false); onChange(); }}
            />
          )}
        </Dialog>

        {pending && (
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
                  paymentId={pending.id}
                  amountCents={pending.amountCents}
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
                  paymentId={pending.id}
                  amountCents={pending.amountCents}
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

/** Detalhes da assinatura: estado atual das datas, cobrança em aberto e alteração de vencimento. */
function SubscriptionDetails({ sub, onSaved }: { sub: SubscriptionRow; onSaved: () => void }) {
  const pending = sub.pendingPayment;
  const overdue = pending ? isOverdue(pending.dueDate) : false;
  const methodLabel = pending?.method
    ? (PAYMENT_METHOD_OPTIONS.find((o) => o.value === pending.method)?.label ?? pending.method)
    : "Não definida";

  const items: [string, string][] = [
    ["Plano", `${sub.planName} · ${formatCents(sub.priceCents)} / ${BILLING_CYCLE_LABEL[sub.billingCycle]?.toLowerCase()}`],
    ["Início da assinatura", formatDateOnly(sub.startedAt)],
    ["Próximo vencimento", formatDateOnly(sub.nextDueDate)],
    [
      "Cobrança em aberto",
      pending
        ? `${formatCents(pending.amountCents)} · vence ${formatDateOnly(pending.dueDate)} · ${overdue ? "em atraso" : "pendente"}`
        : "Nenhuma",
    ],
    ["Forma de pagamento", pending ? methodLabel : "—"],
    ["Cobrança no Asaas", pending ? (pending.gatewayChargeId ? "Gerada" : "Não gerada") : "—"],
    [
      "Último pagamento",
      sub.latestPaidPayment?.paidAt
        ? new Date(sub.latestPaidPayment.paidAt).toLocaleDateString("pt-BR")
        : "Nenhum",
    ],
  ];

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-[var(--muted)]">{label}</dt>
            <dd className={label === "Cobrança em aberto" && overdue ? "text-red-500" : ""}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-[var(--border)] pt-4">
        <p className="mb-3 text-sm font-medium">Alterar vencimento</p>
        <EditDueDateForm subscriptionId={sub.id} currentDate={sub.nextDueDate} onSuccess={onSaved} />
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

/** Altera a data de vencimento da assinatura e da cobrança pendente. */
function EditDueDateForm({
  subscriptionId, currentDate, onSuccess,
}: { subscriptionId: string; currentDate: string; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("dueDate") as string;
        startTransition(async () => {
          const res = await updateSubscriptionDueDate(subscriptionId, value);
          if (res?.error) {
            toast({ variant: "error", description: res.error });
            return;
          }
          toast({ variant: "success", description: res.warning ?? "Vencimento atualizado." });
          onSuccess();
        });
      }}
    >
      <div>
        <Label htmlFor={`due-${subscriptionId}`}>Novo vencimento</Label>
        <Input id={`due-${subscriptionId}`} name="dueDate" type="date" defaultValue={currentDate} required />
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar vencimento"}</Button>
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
