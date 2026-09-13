"use client";

import * as React from "react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";

type PaymentRow = {
    id: string;
    amountCents: number;
    method: string | null;
    status: string;
    dueDate: string;
    paidAt: Date | null;
    studentName: string;
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "danger"> = {
    pending: "outline",
    paid: "success",
    overdue: "danger",
    refunded: "warning",
};

function formatCents(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
    const [query, setQuery] = React.useState("");
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = React.useMemo(() => {
        if (!normalizedQuery) return rows;
        return rows.filter((p) => p.studentName.toLowerCase().includes(normalizedQuery));
    }, [rows, normalizedQuery]);

    return (
        <div>
            <div className="mb-4 max-w-sm">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por aluno..." />
            </div>

            {filtered.length === 0 ? (
                <Panel>
                    <p className="text-sm text-[var(--muted)]">
                        {rows.length === 0 ? "Nenhum pagamento registrado ainda." : `Nenhum pagamento encontrado para "${query}".`}
                    </p>
                </Panel>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((p) => (
                        <Panel key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate font-medium">{p.studentName}</p>
                                    <Badge variant={statusBadgeVariant[p.status] ?? "outline"}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</Badge>
                                    {p.method && <Badge variant="outline">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</Badge>}
                                </div>
                                <p className="truncate text-xs text-[var(--muted)]">
                                    {formatCents(p.amountCents)} · vencimento {new Date(p.dueDate).toLocaleDateString("pt-BR")}
                                    {p.paidAt ? ` · pago em ${new Date(p.paidAt).toLocaleDateString("pt-BR")}` : ""}
                                </p>
                            </div>
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}