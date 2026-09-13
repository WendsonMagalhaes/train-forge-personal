"use client";

import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { EvolutionCharts } from "@/app/(trainer)/dashboard/students/[id]/assessments/evolution-charts";

type AssessmentPhoto = { id: string; angle: string | null; url: string };
type Assessment = {
    id: string;
    assessedAt: string;
    weightKg: string | null;
    bodyFatPct: string | null;
    waistCm: string | null;
    hipCm: string | null;
    chestCm: string | null;
    notes: string | null;
    photos?: AssessmentPhoto[];
};

export function StudentProgressClient({ assessments }: { assessments: Assessment[] }) {
    const sortedDesc = [...assessments].sort((a, b) => (a.assessedAt < b.assessedAt ? 1 : -1));

    return (
        <div className="flex flex-col gap-6">
            <h1 className="font-display text-xl">Evolução</h1>

            <Panel>
                <PanelHeader>
                    <PanelTitle>Gráficos</PanelTitle>
                </PanelHeader>
                <EvolutionCharts assessments={assessments} />
            </Panel>

            <Panel className="p-0">
                <div className="tf-hairline p-5 pb-4">
                    <PanelTitle>Histórico</PanelTitle>
                </div>
                {sortedDesc.length === 0 ? (
                    <p className="p-5 text-sm text-[var(--muted)]">Nenhuma avaliação registrada ainda.</p>
                ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {sortedDesc.map((a) => (
                            <div key={a.id} className="p-5">
                                <p className="text-sm font-medium">
                                    {new Date(a.assessedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                                </p>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                    {a.weightKg ? `${a.weightKg}kg` : "—"}
                                    {a.bodyFatPct ? ` · ${a.bodyFatPct}% gordura` : ""}
                                    {a.waistCm ? ` · cintura ${a.waistCm}cm` : ""}
                                </p>
                                {a.notes && <p className="mt-1 text-xs text-[var(--muted)]">{a.notes}</p>}
                                {a.photos && a.photos.length > 0 && (
                                    <div className="mt-2 flex gap-2">
                                        {a.photos.map((p) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={p.id}
                                                src={p.url}
                                                alt={p.angle ?? "foto de evolução"}
                                                className="h-14 w-14 rounded-[var(--radius)] object-cover"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}