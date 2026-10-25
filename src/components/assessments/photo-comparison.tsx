"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { ChevronLeft, ChevronRight, GitCompareArrows } from "lucide-react";
import { formatDateOnly } from "@/lib/dates";

type AssessmentPhoto = { id: string; angle: string | null; url: string };
type Assessment = { id: string; assessedAt: string; photos?: AssessmentPhoto[] };

const ANGLE_ORDER = ["front", "side", "back"];
const ANGLE_LABEL: Record<string, string> = { front: "Frente", side: "Lado", back: "Costas", geral: "Geral" };

// formato compacto (dd/mm/aa) para caber nos seletores em qualquer tela
function formatDate(d: string) {
  return formatDateOnly(d, { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function angleRank(angle: string) {
  const i = ANGLE_ORDER.indexOf(angle);
  return i === -1 ? ANGLE_ORDER.length : i;
}

export function PhotoComparison({ assessments }: { assessments: Assessment[] }) {
  const withPhotos = useMemo(
    () => [...assessments].filter((a) => a.photos && a.photos.length > 0).sort((a, b) => (a.assessedAt < b.assessedAt ? 1 : -1)),
    [assessments]
  );

  const angles = useMemo(() => {
    const set = new Set<string>();
    for (const a of withPhotos) for (const p of a.photos ?? []) set.add(p.angle ?? "geral");
    return [...set].sort((x, y) => angleRank(x) - angleRank(y));
  }, [withPhotos]);

  const [beforeId, setBeforeId] = useState(withPhotos.at(-1)?.id ?? "");
  const [afterId, setAfterId] = useState(withPhotos[0]?.id ?? "");
  const [angleChoice, setAngleChoice] = useState("");
  const [pos, setPos] = useState(50);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  if (withPhotos.length < 2) return null;

  const activeAngle = angles.includes(angleChoice) ? angleChoice : (angles[0] ?? "");
  const before = withPhotos.find((a) => a.id === beforeId);
  const after = withPhotos.find((a) => a.id === afterId);
  const beforePhoto = before?.photos?.find((p) => (p.angle ?? "geral") === activeAngle);
  const afterPhoto = after?.photos?.find((p) => (p.angle ?? "geral") === activeAngle);

  function moveTo(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragging.current) moveTo(e.clientX);
  }

  function onPointerUp() {
    dragging.current = false;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") { e.preventDefault(); setPos((p) => Math.max(0, p - 2)); }
    if (e.key === "ArrowRight") { e.preventDefault(); setPos((p) => Math.min(100, p + 2)); }
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" /> Comparar evolução
        </PanelTitle>
      </PanelHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--muted)]">Antes</label>
          <select
            value={beforeId}
            onChange={(e) => setBeforeId(e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-xs outline-none focus-visible:border-[var(--tf-ember)] sm:px-3 sm:text-sm"
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
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-xs outline-none focus-visible:border-[var(--tf-ember)] sm:px-3 sm:text-sm"
          >
            {withPhotos.map((a) => (
              <option key={a.id} value={a.id}>{formatDate(a.assessedAt)}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-xs text-[var(--muted)]">Ângulo</label>
          <select
            value={activeAngle}
            onChange={(e) => setAngleChoice(e.target.value)}
            className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-xs outline-none focus-visible:border-[var(--tf-ember)] sm:px-3 sm:text-sm"
          >
            {angles.map((angle) => (
              <option key={angle} value={angle}>{ANGLE_LABEL[angle] ?? angle}</option>
            ))}
          </select>
        </div>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Comparar antes e depois"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="relative mx-auto aspect-[3/4] w-full max-w-md touch-none select-none overflow-hidden rounded-[var(--radius)] bg-[var(--background)] cursor-ew-resize outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-ember)]"
      >
        {/* Depois: camada de base, visível à direita da linha */}
        {afterPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={afterPhoto.url} alt="Depois" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted)]">Sem foto no depois</div>
        )}

        {/* Antes: recortada para aparecer apenas à esquerda da linha */}
        {beforePhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={beforePhoto.url}
            alt="Antes"
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Linha divisória com alça */}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${pos}%` }}>
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
            <ChevronLeft className="-mr-1 h-4 w-4" />
            <ChevronRight className="-ml-1 h-4 w-4" />
          </div>
        </div>

        {/* Rótulos */}
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          Antes · {before ? formatDate(before.assessedAt) : "—"}
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          Depois · {after ? formatDate(after.assessedAt) : "—"}
        </span>

        {!beforePhoto && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-max rounded bg-black/60 px-3 py-1 text-xs text-white">
            Sem foto de antes neste ângulo
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-xs text-[var(--muted)]">
        Arraste a linha ou use as setas do teclado para comparar.
      </p>
    </Panel>
  );
}
