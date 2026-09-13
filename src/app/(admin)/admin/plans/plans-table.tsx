"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deletePlanAdmin } from "@/lib/actions/admin";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { BILLING_CYCLE_LABEL } from "@/lib/constants";
import { Trash2 } from "lucide-react";

type PlanRow = {
    id: string;
    name: string;
    priceCents: number;
    billingCycle: string;
    sessionsIncluded: number | null;
    active: string | null;
    trainerId: string;
    trainerName: string;
};

function formatCents(cents: number) {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PlansTable({ rows }: { rows: PlanRow[] }) {
    const router = useRouter();
    const [query, setQuery] = React.useState("");
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = React.useMemo(() => {
        if (!normalizedQuery) return rows;
        return rows.filter(
            (p) => p.name.toLowerCase().includes(normalizedQuery) || p.trainerName.toLowerCase().includes(normalizedQuery)
        );
    }, [rows, normalizedQuery]);

    return (
        <div>
            <div className="mb-4 max-w-sm">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por plano ou personal..." />
            </div>

            {filtered.length === 0 ? (
                <Panel>
                    <p className="text-sm text-[var(--muted)]">
                        {rows.length === 0 ? "Nenhum plano cadastrado ainda." : `Nenhum plano encontrado para "${query}".`}
                    </p>
                </Panel>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((p) => (
                        <Panel key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate font-medium">{p.name}</p>
                                    <Badge variant={p.active === "true" ? "success" : "outline"}>
                                        {p.active === "true" ? "Ativo" : "Inativo"}
                                    </Badge>
                                    <Badge variant="secondary">{BILLING_CYCLE_LABEL[p.billingCycle] ?? p.billingCycle}</Badge>
                                </div>
                                <p className="truncate text-xs text-[var(--muted)]">
                                    {formatCents(p.priceCents)} · {p.sessionsIncluded ? `${p.sessionsIncluded} sessões` : "sessões ilimitadas"} · Personal: {p.trainerName}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <ConfirmDeleteButton
                                    itemLabel={p.name}
                                    trigger={<button className="text-[var(--muted)] transition-colors hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
                                    onConfirm={async () => { await deletePlanAdmin(p.id); router.refresh(); }}
                                />
                            </div>
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}