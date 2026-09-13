"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deleteSessionAdmin } from "@/lib/actions/admin";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { SESSION_MODE_LABEL, SESSION_STATUS_LABEL } from "@/lib/constants";
import { Trash2 } from "lucide-react";

type SessionRow = {
    id: string;
    startsAt: Date;
    endsAt: Date;
    mode: string;
    status: string;
    confirmedByStudent: boolean | null;
    trainerId: string;
    trainerName: string;
    studentName: string;
};

const statusBadgeVariant: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "danger"> = {
    scheduled: "outline",
    confirmed: "secondary",
    completed: "success",
    missed: "danger",
    rescheduled: "warning",
    canceled: "danger",
};

export function SessionsTable({ rows }: { rows: SessionRow[] }) {
    const router = useRouter();
    const [query, setQuery] = React.useState("");
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = React.useMemo(() => {
        if (!normalizedQuery) return rows;
        return rows.filter(
            (s) => s.studentName.toLowerCase().includes(normalizedQuery) || s.trainerName.toLowerCase().includes(normalizedQuery)
        );
    }, [rows, normalizedQuery]);

    return (
        <div>
            <div className="mb-4 max-w-sm">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por aluno ou personal..." />
            </div>

            {filtered.length === 0 ? (
                <Panel>
                    <p className="text-sm text-[var(--muted)]">
                        {rows.length === 0 ? "Nenhuma sessão cadastrada ainda." : `Nenhuma sessão encontrada para "${query}".`}
                    </p>
                </Panel>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((s) => (
                        <Panel key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate font-medium">{s.studentName}</p>
                                    <Badge variant={statusBadgeVariant[s.status] ?? "outline"}>{SESSION_STATUS_LABEL[s.status] ?? s.status}</Badge>
                                    <Badge variant="outline">{SESSION_MODE_LABEL[s.mode] ?? s.mode}</Badge>
                                    {s.confirmedByStudent && <Badge variant="success">Confirmada pelo aluno</Badge>}
                                </div>
                                <p className="truncate text-xs text-[var(--muted)]">
                                    {new Date(s.startsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · Personal: {s.trainerName}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <ConfirmDeleteButton
                                    itemLabel={`sessão de ${s.studentName}`}
                                    trigger={<button className="text-[var(--muted)] transition-colors hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
                                    onConfirm={async () => { await deleteSessionAdmin(s.id); router.refresh(); }}
                                />
                            </div>
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}