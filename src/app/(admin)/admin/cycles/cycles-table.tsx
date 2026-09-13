"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deleteCycleAdmin } from "@/lib/actions/admin";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Trash2 } from "lucide-react";

type CycleRow = {
    id: string;
    name: string;
    goal: string | null;
    startDate: string;
    endDate: string | null;
    isActive: boolean | null;
    studentName: string;
    trainerName: string;
};

export function CyclesTable({ rows }: { rows: CycleRow[] }) {
    const router = useRouter();
    const [query, setQuery] = React.useState("");
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = React.useMemo(() => {
        if (!normalizedQuery) return rows;
        return rows.filter(
            (c) => c.studentName.toLowerCase().includes(normalizedQuery) || c.trainerName.toLowerCase().includes(normalizedQuery)
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
                        {rows.length === 0 ? "Nenhum ciclo cadastrado ainda." : `Nenhum ciclo encontrado para "${query}".`}
                    </p>
                </Panel>
            ) : (
                <div className="flex flex-col gap-2">
                    {filtered.map((c) => (
                        <Panel key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate font-medium">{c.name}</p>
                                    <Badge variant={c.isActive ? "success" : "outline"}>{c.isActive ? "Ativo" : "Encerrado"}</Badge>
                                </div>
                                <p className="truncate text-xs text-[var(--muted)]">
                                    {c.studentName} · Personal: {c.trainerName}
                                    {c.goal ? ` · ${c.goal}` : ""} · desde {new Date(c.startDate).toLocaleDateString("pt-BR")}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                                <ConfirmDeleteButton
                                    itemLabel={c.name}
                                    trigger={<button className="text-[var(--muted)] transition-colors hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
                                    onConfirm={async () => { await deleteCycleAdmin(c.id); router.refresh(); }}
                                />
                            </div>
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}