"use client";

import { useMemo, useState } from "react";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { GitCompareArrows } from "lucide-react";

type AssessmentPhoto = { id: string; angle: string | null; url: string };
type Assessment = { id: string; assessedAt: string; photos?: AssessmentPhoto[] };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PhotoComparison({ assessments }: { assessments: Assessment[] }) {
  const withPhotos = useMemo(
    () => [...assessments].filter((a) => a.photos && a.photos.length > 0).sort((a, b) => (a.assessedAt < b.assessedAt ? 1 : -1)),
    [assessments]
  );

  const [beforeId, setBeforeId] = useState(withPhotos.at(-1)?.id ?? "");
  const [afterId, setAfterId] = useState(withPhotos[0]?.id ?? "");

  if (withPhotos.length < 2) return null;

  const before = withPhotos.find((a) => a.id === beforeId);
  const after = withPhotos.find((a) => a.id === afterId);

  // ângulos presentes em pelo menos uma das duas avaliações, pra parear foto a foto
  const angles = Array.from(
    new Set([...(before?.photos ?? []), ...(after?.photos ?? [])].map((p) => p.angle ?? "geral"))
  );

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" /> Comparar evolução
        </PanelTitle>
      </PanelHeader>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--muted)]">Antes</label>
          <select
            value={beforeId}
            onChange={(e) => setBeforeId(e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
          >
            {withPhotos.map((a) => (
              <option key={a.id} value={a.id}>{formatDate(a.assessedAt)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--muted)]">Depois</label>
          <select
            value={afterId}
            onChange={(e) => setAfterId(e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
          >
            {withPhotos.map((a) => (
              <option key={a.id} value={a.id}>{formatDate(a.assessedAt)}</option>
            ))}
          </select>
        </div>
      </div>

      {angles.map((angle) => {
        const beforePhoto = before?.photos?.find((p) => (p.angle ?? "geral") === angle);
        const afterPhoto = after?.photos?.find((p) => (p.angle ?? "geral") === angle);
        if (!beforePhoto && !afterPhoto) return null;

        return (
          <div key={angle} className="mb-4 last:mb-0">
            <p className="mb-1.5 text-xs capitalize text-[var(--muted)]">{angle}</p>
            <div className="grid grid-cols-2 gap-3">
              <PhotoSlot photo={beforePhoto} />
              <PhotoSlot photo={afterPhoto} />
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

function PhotoSlot({ photo }: { photo?: AssessmentPhoto }) {
  if (!photo) {
    return <div className="flex aspect-[3/4] items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--border)] text-xs text-[var(--muted)]">Sem foto</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo.url} alt={photo.angle ?? "foto de evolução"} className="aspect-[3/4] w-full rounded-[var(--radius)] object-cover" />
  );
}
