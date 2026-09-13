"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAssessment, deleteAssessmentPhoto } from "@/lib/actions/assessments";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { EvolutionCharts } from "./evolution-charts";
import { PhotoComparison } from "./photo-comparison";
import { NewAssessmentForm } from "./new-assessment-form";
import { Plus, Trash2, X } from "lucide-react";

type AssessmentPhoto = { id: string; angle: string | null; url: string };
type Assessment = {
  id: string; assessedAt: string; weightKg: string | null; bodyFatPct: string | null;
  waistCm: string | null; hipCm: string | null; chestCm: string | null; notes: string | null;
  photos?: AssessmentPhoto[];
};

export function AssessmentsClient({ studentId, assessments }: { studentId: string; assessments: Assessment[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const refresh = () => router.refresh();

  const sortedDesc = [...assessments].sort((a, b) => (a.assessedAt < b.assessedAt ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Antropometria</h2>
        <Dialog
          size="lg"
          title="Nova avaliação"
          description="Medidas corporais do dia."
          trigger={<Button><Plus className="h-4 w-4" />Nova avaliação</Button>}
          open={open}
          onOpenChange={setOpen}
        >
          {() => <NewAssessmentForm studentId={studentId} onSuccess={() => { setOpen(false); refresh(); }} />}
        </Dialog>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Evolução</PanelTitle>
        </PanelHeader>
        <EvolutionCharts assessments={assessments} />
      </Panel>

      <PhotoComparison assessments={assessments} />

      <Panel className="p-0">
        <div className="tf-hairline p-5 pb-4">
          <PanelTitle>Histórico</PanelTitle>
        </div>
        {sortedDesc.length === 0 ? (
          <p className="p-5 text-sm text-[var(--muted)]">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {sortedDesc.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
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
                        <div key={p.id} className="group relative h-14 w-14 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.url}
                            alt={p.angle ?? "foto de evolução"}
                            className="h-14 w-14 rounded-[var(--radius)] object-cover"
                          />
                          <button
                            type="button"
                            onClick={async () => { await deleteAssessmentPhoto(studentId, p.id); refresh(); }}
                            className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white group-hover:flex"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <ConfirmDeleteButton
                  itemLabel={`avaliação de ${new Date(a.assessedAt).toLocaleDateString("pt-BR")}`}
                  trigger={<button className="shrink-0 text-[var(--muted)] transition-colors hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
                  onConfirm={async () => { await deleteAssessment(studentId, a.id); refresh(); }}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}