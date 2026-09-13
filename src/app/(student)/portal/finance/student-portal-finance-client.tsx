"use client";

import { Panel, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { BILLING_CYCLE_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { FileText } from "lucide-react";

type Subscription = {
  id: string;
  status: string;
  nextDueDate: string;
  planId: string;
  planName: string;
  priceCents: number;
  billingCycle: string;
} | null;

type PaymentRow = {
  id: string;
  amountCents: number;
  method: string | null;
  status: string;
  dueDate: string;
  paidAt: Date | null;
  planName: string;
  billingCycle: string;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_VARIANT: Record<string, "success" | "outline" | "danger" | "secondary"> = {
  paid: "success",
  pending: "outline",
  overdue: "danger",
  refunded: "secondary",
};

const SUB_STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  past_due: "Em atraso",
  canceled: "Cancelada",
  paused: "Pausada",
};

const SUB_STATUS_VARIANT: Record<string, "success" | "outline" | "danger"> = {
  active: "success",
  past_due: "danger",
  canceled: "outline",
  paused: "outline",
};

export function StudentPortalFinanceClient({ subscription, history }: { subscription: Subscription; history: PaymentRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl">Financeiro</h1>

      {subscription ? (
        <Panel>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)]">Seu plano</p>
              <p className="truncate font-medium">{subscription.planName}</p>
            </div>
            <Badge variant={SUB_STATUS_VARIANT[subscription.status] ?? "outline"}>
              {SUB_STATUS_LABEL[subscription.status] ?? subscription.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--primary)]">
            {formatCents(subscription.priceCents)}{" "}
            <span className="text-[var(--muted)]">/ {BILLING_CYCLE_LABEL[subscription.billingCycle]?.toLowerCase()}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Próximo vencimento: {formatDate(subscription.nextDueDate)}</p>
        </Panel>
      ) : (
        <Panel className="text-center">
          <p className="text-sm text-[var(--muted)]">Nenhum plano ativo no momento.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Fale com seu personal para assinar um plano.</p>
        </Panel>
      )}

      <Panel className="p-0">
        <div className="tf-hairline p-5 pb-4">
          <PanelTitle>Histórico de faturas</PanelTitle>
        </div>

        {history.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">Nenhuma cobrança registrada ainda.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {history.map((p) => (
              <div key={p.id} className="p-5">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{formatCents(p.amountCents)}</p>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {p.planName} · vencimento {formatDate(p.dueDate)}
                  {p.paidAt && ` · pago em ${formatDate(p.paidAt)}`}
                </p>
                {p.method && <p className="mt-0.5 text-xs text-[var(--muted)]">{PAYMENT_METHOD_LABEL[p.method]}</p>}
                {p.status === "paid" && (
                  <a
                    href={`/api/invoices/${p.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" /> Baixar recibo
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
