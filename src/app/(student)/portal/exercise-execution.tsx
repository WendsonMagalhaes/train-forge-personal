"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABEL } from "@/lib/constants";
import { Dumbbell, Check, SkipForward, PlayCircle, Repeat } from "lucide-react";

type SetDetailRow = {
  setNumber: number;
  label?: string;
  reps?: string;
  loadKg?: number;
  restSeconds?: number;
  holdSeconds?: number;
};

type SubstituteExercise = {
  id: string;
  exerciseName: string;
  imageUrl: string | null;
  videoUrl: string | null;
  muscleGroup: string;
  muscleGroupDetail?: string | null;
  equipment?: string | null;
};

type ExerciseInfo = {
  id: string;
  exerciseName: string;
  videoUrl: string | null;
  imageUrl: string | null;
  muscleGroup: string;
  muscleGroupDetail?: string | null;
  secondaryMuscles?: string[] | null;
  equipment?: string | null;
  instructions?: string | null;
  reps: string | null;
  loadKg: string | null;
  holdSeconds: number | null;
  setsDetail: SetDetailRow[] | null;
  suggestedLoadKg?: number | null;
  /** Exercícios que trabalham os mesmos músculos e podem substituir esse (cadastrados pelo personal). */
  substitutes?: SubstituteExercise[];
};

type SetLog = { reps: string; loadKg: string };
type CompletionData = { loadKg?: string; setsCompleted: number; repsCompleted: string };

/** Detecta link do YouTube/Vimeo e devolve a URL de embed — senão, null. */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

/** Tenta como imagem/gif primeiro (caso mais comum, inclusive o da API de exercícios importados)
 *  e cai pra vídeo se falhar — não depende da extensão da URL, que nem sempre é confiável. */
function DirectMedia({ url, alt, onBothFailed }: { url: string; alt: string; onBothFailed: () => void }) {
  const [stage, setStage] = useState<"image" | "video">("image");
  if (stage === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} onError={() => setStage("video")} className="w-full rounded-[var(--radius)] object-contain" />;
  }
  return (
    <video src={url} controls autoPlay loop muted playsInline onError={onBothFailed} className="w-full rounded-[var(--radius)] bg-black" />
  );
}

function ExerciseMedia({ item }: { item: ExerciseInfo }) {
  const embedUrl = item.videoUrl ? toEmbedUrl(item.videoUrl) : null;
  const [directFailed, setDirectFailed] = useState(false);
  const showDirect = item.videoUrl && !embedUrl;

  if (embedUrl) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-[var(--radius)] bg-black">
        <iframe
          src={embedUrl}
          title={`Como executar: ${item.exerciseName}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  if (showDirect && !directFailed) {
    return <DirectMedia url={item.videoUrl!} alt={`Execução: ${item.exerciseName}`} onBothFailed={() => setDirectFailed(true)} />;
  }
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt={item.exerciseName} className="max-h-64 w-full rounded-[var(--radius)] object-cover" />;
  }
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius)] bg-[var(--background)]">
      <Dumbbell className="h-8 w-8 text-[var(--muted)]" />
    </div>
  );
}

/** Miniatura pra linha do exercício — mesma cascata de fallback, em tamanho pequeno. */
export function ExerciseThumbnail({ item, className = "h-12 w-12" }: { item: ExerciseInfo; className?: string }) {
  const isEmbed = item.videoUrl ? !!toEmbedUrl(item.videoUrl) : false;
  const [stage, setStage] = useState<"gif" | "video" | "fallback">(item.videoUrl && !isEmbed ? "gif" : "fallback");

  const base = `${className} shrink-0 rounded-[var(--radius)] object-cover`;

  if (stage === "gif") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.videoUrl!} alt={item.exerciseName} onError={() => setStage("video")} className={base} />;
  }
  if (stage === "video") {
    return <video src={item.videoUrl!} autoPlay loop muted playsInline onError={() => setStage("fallback")} className={base} />;
  }
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt={item.exerciseName} className={base} />;
  }
  return (
    <div className={`flex ${className} shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--background)]`}>
      <Dumbbell className="h-5 w-5 text-[var(--muted)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal 1: INFORMAÇÃO — aberto ao clicar na miniatura/gif. Só mostra o vídeo/
// gif ampliado + músculos + instruções. Nada de série ou cronômetro aqui.
// ---------------------------------------------------------------------------
export function ExerciseInfoTrigger({ item, children }: { item: ExerciseInfo; children: React.ReactNode }) {
  return (
    <Dialog title={item.exerciseName} size="lg" trigger={children}>
      {() => (
        <div className="flex flex-col gap-4">
          <ExerciseMedia item={item} />

          {item.videoUrl && !toEmbedUrl(item.videoUrl) && (
            <a href={item.videoUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--primary)] hover:underline">
              <PlayCircle className="h-4 w-4" /> Abrir em nova guia
            </a>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{MUSCLE_GROUP_LABEL[item.muscleGroup as keyof typeof MUSCLE_GROUP_LABEL] ?? item.muscleGroup}</Badge>
            {item.muscleGroupDetail && <Badge variant="outline">{item.muscleGroupDetail}</Badge>}
            {item.secondaryMuscles?.map((m) => <Badge key={m} variant="secondary">{m}</Badge>)}
            {item.equipment && <Badge variant="secondary">{item.equipment}</Badge>}
          </div>

          {item.instructions && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--muted)]">Como executar</p>
              <p className="whitespace-pre-line text-sm text-[var(--foreground)]">{item.instructions}</p>
            </div>
          )}

          {item.substitutes && item.substitutes.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                <Repeat className="h-3.5 w-3.5" /> Não pode fazer esse? Substitua por
              </p>
              <div className="flex flex-col gap-2">
                {item.substitutes.map((sub) => (
                  <SubstituteRow key={sub.id} substitute={sub} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

/** Linha compacta de um exercício substituto — abre o próprio modal de informação ao tocar. */
function SubstituteRow({ substitute }: { substitute: SubstituteExercise }) {
  const asExerciseInfo: ExerciseInfo = {
    id: substitute.id,
    exerciseName: substitute.exerciseName,
    videoUrl: substitute.videoUrl,
    imageUrl: substitute.imageUrl,
    muscleGroup: substitute.muscleGroup,
    muscleGroupDetail: substitute.muscleGroupDetail,
    equipment: substitute.equipment,
    reps: null,
    loadKg: null,
    holdSeconds: null,
    setsDetail: null,
  };

  return (
    <ExerciseInfoTrigger item={asExerciseInfo}>
      <div className="tf-tap flex cursor-pointer items-center gap-3 rounded-[var(--radius)] bg-[var(--background)] p-2">
        <ExerciseThumbnail item={asExerciseInfo} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{substitute.exerciseName}</p>
          {substitute.equipment && <p className="truncate text-xs text-[var(--muted)]">{substitute.equipment}</p>}
        </div>
      </div>
    </ExerciseInfoTrigger>
  );
}

// ---------------------------------------------------------------------------
// Modal 2: EXECUÇÃO — aberto pelo botão "Executar exercício". Abre DIRETO em
// "Série 1 de N", sem gif. Ao concluir uma série, entra o cronômetro de
// descanso; ao zerar (ou "Pular descanso"), avança pra próxima sozinho.
// ---------------------------------------------------------------------------
function RestTimer({ seconds, onDone, onSkip }: { seconds: number; onDone: () => void; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (remaining <= 0) {
      doneRef.current();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const pct = Math.max(0, Math.min(100, (remaining / seconds) * 100));

  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] bg-[var(--background)] py-8">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Descanso</p>
      <p className="font-display text-6xl tabular-nums">{remaining}s</p>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full bg-[var(--primary)] transition-all duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <button type="button" onClick={onSkip} className="tf-tap inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
        <SkipForward className="h-3.5 w-3.5" /> Pular descanso
      </button>
    </div>
  );
}

export function ExerciseExecutionTrigger({
  item, blockRestSeconds, blockRounds, children, onComplete,
}: {
  item: ExerciseInfo;
  blockRestSeconds: number | null;
  blockRounds: number;
  children: React.ReactNode;
  onComplete: (data: CompletionData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog title={item.exerciseName} size="md" trigger={children} open={open} onOpenChange={setOpen}>
      {(close) => (
        <ExecutionStepper
          item={item}
          blockRestSeconds={blockRestSeconds}
          blockRounds={blockRounds}
          onComplete={(data) => {
            onComplete(data);
            close();
          }}
        />
      )}
    </Dialog>
  );
}

function ExecutionStepper({
  item, blockRestSeconds, blockRounds, onComplete,
}: { item: ExerciseInfo; blockRestSeconds: number | null; blockRounds: number; onComplete: (data: CompletionData) => void }) {
  // Séries detalhadas (pirâmide/drop-set/etc.) mandam; senão, usa o "rounds" do
  // bloco — é o "3x" comum de um exercício simples. Nunca menos que 1.
  const totalSets = item.setsDetail && item.setsDetail.length > 0 ? item.setsDetail.length : Math.max(1, blockRounds || 1);
  const [setIndex, setSetIndex] = useState(0); // 0-based
  const [resting, setResting] = useState(false);
  const [log, setLog] = useState<SetLog[]>([]);

  const prescribed = item.setsDetail?.[setIndex];
  const [reps, setReps] = useState(prescribed?.reps ?? item.reps ?? "");
  const [load, setLoad] = useState(
    prescribed?.loadKg != null ? String(prescribed.loadKg)
      : item.suggestedLoadKg != null ? String(item.suggestedLoadKg)
      : item.loadKg ?? ""
  );

  function updateFieldsForSet(index: number) {
    const s = item.setsDetail?.[index];
    setReps(s?.reps ?? item.reps ?? "");
    setLoad(s?.loadKg != null ? String(s.loadKg) : item.suggestedLoadKg != null ? String(item.suggestedLoadKg) : item.loadKg ?? "");
  }

  function finishSet() {
    const newLog = [...log, { reps, loadKg: load }];
    setLog(newLog);

    const isLast = setIndex + 1 >= totalSets;
    if (isLast) {
      onComplete({
        loadKg: newLog.at(-1)?.loadKg || undefined,
        setsCompleted: newLog.length,
        repsCompleted: newLog.map((s) => s.reps || "—").join(", "),
      });
      return;
    }
    setResting(true);
  }

  function advanceAfterRest() {
    setResting(false);
    const next = setIndex + 1;
    setSetIndex(next);
    updateFieldsForSet(next);
  }

  const restSeconds = item.setsDetail?.[setIndex]?.restSeconds ?? blockRestSeconds ?? 60;

  if (resting) {
    return <RestTimer seconds={restSeconds} onDone={advanceAfterRest} onSkip={advanceAfterRest} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-2xl">Série {setIndex + 1} de {totalSets}</p>
        {log.length > 0 && (
          <span className="text-xs text-[var(--muted)]">{log.length} concluída{log.length > 1 ? "s" : ""}</span>
        )}
      </div>

      {item.holdSeconds ? (
        <p className="text-sm text-[var(--muted)]">Sustente por {item.holdSeconds}s</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Repetições</label>
            <input
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="Ex: 12"
              className="h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--muted)]">Carga (kg)</label>
            <input
              type="number"
              step="0.5"
              value={load}
              onChange={(e) => setLoad(e.target.value)}
              placeholder="Ex: 20"
              className="h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
            />
          </div>
        </div>
      )}

      <Button className="w-full" onClick={finishSet}>
        <Check className="h-4 w-4" />
        {setIndex + 1 >= totalSets ? "Concluir exercício" : "Concluir série e descansar"}
      </Button>
    </div>
  );
}
