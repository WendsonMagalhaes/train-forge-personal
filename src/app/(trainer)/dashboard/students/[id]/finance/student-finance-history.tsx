"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { syncGatewayCharge } from "@/lib/actions/finance";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, BILLING_CYCLE_LABEL } from "@/lib/constants";
import { FileText, RefreshCw } from "lucide-react";

type PaymentRow = {
  id: string;
  amountCents: number;
  method: string | null;
  status: string;
  dueDate: string;
  paidAt: Date | null;
  createdAt: Date;
  gatewayChargeId: string | null;
  planName: string;
  billingCycle: string;
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_VARIANT: Record<string, "success" | "outline" | "danger" | "secondary"> = {
  paid: "success",
  pending: "outline",
  overdue: "danger",
  refunded: "secondary",
};

export function StudentFinanceHistory({ history }: { history: PaymentRow[] }) {
  const router = useRouter();
  const totalPaidCents = history.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <Panel className="p-0">
      <div className="tf-hairline flex flex-wrap items-center justify-between gap-2 p-5 pb-4">
        <PanelTitle>Histórico de cobranças</PanelTitle>
        {totalPaidCents > 0 && (
          <span className="text-xs text-[var(--muted)]">
            Total pago: <b className="text-[var(--foreground)]">{formatCents(totalPaidCents)}</b>
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <p className="p-5 text-sm text-[var(--muted)]">Nenhuma cobrança registrada ainda para este aluno.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {history.map((p) => (
            <PaymentHistoryRow key={p.id} payment={p} onSynced={() => router.refresh()} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function PaymentHistoryRow({ payment, onSynced }: { payment: PaymentRow; onSynced: () => void }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSync() {
    startTransition(async () => {
      const res = await syncGatewayCharge(payment.id);
      if (res?.error) {
        toast({ variant: "error", description: res.error });
      } else {
        toast({ variant: "success", description: res.message ?? "Status atualizado." });
        onSynced();
      }
    });
  }

  const canSync = (payment.status === "pending" || payment.status === "overdue") && payment.gatewayChargeId;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{formatCents(payment.amountCents)}</p>
          <Badge variant={STATUS_VARIANT[payment.status] ?? "outline"}>
            {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {payment.planName} · {BILLING_CYCLE_LABEL[payment.billingCycle]?.toLowerCase()} · vencimento{" "}
          {formatDate(payment.dueDate)}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {payment.method ? PAYMENT_METHOD_LABEL[payment.method] : "Forma de pagamento não definida"}
          {payment.paidAt && ` · pago em ${formatDate(payment.paidAt)}`}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {payment.status === "paid" && (
          <a
            href={`/api/invoices/${payment.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <FileText className="h-3.5 w-3.5" /> Recibo
          </a>
        )}
        {canSync && (
          <Button size="sm" variant="secondary" onClick={handleSync} disabled={pending}>
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
            {pending ? "Verificando…" : "Verificar status"}
          </Button>
        )}
      </div>
    </div>
  );
}
