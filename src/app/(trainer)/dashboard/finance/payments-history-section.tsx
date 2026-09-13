"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Panel, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { syncGatewayCharge } from "@/lib/actions/finance";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, BILLING_CYCLE_LABEL } from "@/lib/constants";
import { FileText, RefreshCw, Search } from "lucide-react";

export type PaymentHistoryRow = {
  id: string;
  amountCents: number;
  method: string | null;
  status: string;
  dueDate: string;
  paidAt: Date | null;
  createdAt: Date;
  gatewayChargeId: string | null;
  studentId: string;
  studentName: string;
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

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "overdue", label: "Atrasadas" },
  { value: "paid", label: "Pagas" },
  { value: "refunded", label: "Reembolsadas" },
];

export function PaymentsHistorySection({ payments }: { payments: PaymentHistoryRow[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (term && !p.studentName.toLowerCase().includes(term) && !p.planName.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [payments, statusFilter, search]);

  const totalPaidCents = filtered.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <Panel className="p-0">
      <div className="tf-hairline flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
        <PanelTitle>Histórico de movimentações</PanelTitle>
        {totalPaidCents > 0 && (
          <span className="text-xs text-[var(--muted)]">
            Total pago (filtro atual): <b className="text-[var(--foreground)]">{formatCents(totalPaidCents)}</b>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-5 py-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            placeholder="Buscar por aluno ou plano…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-[var(--radius)] border px-2.5 py-1 text-xs transition-colors ${
                statusFilter === f.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="p-5 text-sm text-[var(--muted)]">Nenhuma movimentação encontrada.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function PaymentRow({ payment }: { payment: PaymentHistoryRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const res = await syncGatewayCharge(payment.id);
      if (res?.error) {
        toast({ variant: "error", description: res.error });
      } else {
        toast({ variant: "success", description: res.message ?? "Status atualizado." });
        router.refresh();
      }
    });
  }

  const canSync = (payment.status === "pending" || payment.status === "overdue") && payment.gatewayChargeId;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dashboard/students/${payment.studentId}/finance`} className="font-medium hover:text-[var(--primary)] hover:underline">
            {payment.studentName}
          </Link>
          <Badge variant={STATUS_VARIANT[payment.status] ?? "outline"}>
            {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {formatCents(payment.amountCents)} · {payment.planName} · {BILLING_CYCLE_LABEL[payment.billingCycle]?.toLowerCase()} · vencimento{" "}
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
