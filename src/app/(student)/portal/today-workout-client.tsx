"use client";

import { toDisplayText } from "@/lib/text-case";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { logWorkoutCompletion, logExerciseFeedback } from "@/lib/actions/student-workout";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { SERIES_TYPE_LABEL, MUSCLE_GROUP_LABEL, type MuscleGroup, type SeriesType } from "@/lib/constants";
import { Check, TrendingUp, TrendingDown, Minus, Play } from "lucide-react";
import { ExerciseExecutionTrigger, ExerciseInfoTrigger, ExerciseThumbnail } from "./exercise-execution";

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

type Item = {
  id: string;
  reps: string | null;
  loadKg: string | null;
  holdSeconds: number | null;
  setsDetail: SetDetailRow[] | null;
  exerciseId?: string;
  exerciseName: string;
  videoUrl: string | null;
  imageUrl: string | null;
  muscleGroup: string;
  muscleGroupDetail?: string | null;
  secondaryMuscles?: string[] | null;
  equipment?: string | null;
  instructions?: string | null;
  lastLoadKg?: number | null;
  /** Já marcado como feito nesta semana (vem do servidor; zera na segunda-feira). */
  doneThisWeek?: boolean;
  lastRpe?: number | null;
  suggestedLoadKg?: number | null;
  loadSuggestionRationale?: string | null;
  substitutes?: SubstituteExercise[];
};

export type Block = {
  id: string;
  seriesType: SeriesType;
  rounds: number;
  restSeconds: number | null;
  notes: string | null;
  items: Item[];
};

type CompletionData = { loadKg?: string; setsCompleted: number; repsCompleted: string };

/** Ícone discreto de "concluir": vira botão com texto ao passar o mouse (ou focar, no toque). */
function DoneIconButton({
  text, disabled, onClick, className,
}: { text: string; disabled?: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group/done tf-tap flex h-9 shrink-0 items-center gap-0 overflow-hidden rounded-full border border-[var(--border)] px-2 text-[var(--muted)] transition-all duration-200",
        "hover:gap-1.5 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:px-3 hover:text-[var(--primary-foreground)]",
        "focus-visible:gap-1.5 focus-visible:border-[var(--primary)] focus-visible:bg-[var(--primary)] focus-visible:px-3 focus-visible:text-[var(--primary-foreground)]",
        "disabled:opacity-50",
        className
      )}
    >
      <Check className="h-4 w-4 shrink-0" />
      <span className="max-w-0 whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-200 group-hover/done:max-w-[240px] group-hover/done:opacity-100 group-focus-visible/done:max-w-[240px] group-focus-visible/done:opacity-100">
        {text}
      </span>
    </button>
  );
}

export function TodayWorkoutClient({ planId, blocks, title }: { planId: string; blocks: Block[]; title?: string }) {
  const [done, setDone] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(blocks.flatMap((b) => b.items).filter((i) => i.doneThisWeek).map((i) => [i.id, true]))
  );
  // Treino finalizado nesta semana: todos os exercícios já estão marcados.
  const [finished, setFinished] = useState(() => {
    const all = blocks.flatMap((b) => b.items);
    return all.length > 0 && all.every((i) => i.doneThisWeek);
  });
  const [busy, setBusy] = useState(false);
  // Ref (e não estado) para o registro do treino: marcações seguidas, antes do re-render,
  // reaproveitam o mesmo registro em vez de criar um novo a cada exercício.
  const logRef = useRef<string | null>(null);

  const allItems = blocks.flatMap((b) => b.items);

  async function ensureLog() {
    if (logRef.current) return logRef.current;
    const res = await logWorkoutCompletion(planId, "moderado", "");
    logRef.current = res.logId;
    return res.logId;
  }

  async function markDone(item: Item, data: CompletionData) {
    const id = await ensureLog();
    await logExerciseFeedback(id, item.id, { ...data, difficultyRpe: 7 });
    setDone((d) => ({ ...d, [item.id]: true }));
  }

  /** Dados prescritos (carga, séries, repetições), para marcar sem abrir a execução. */
  function prescribedData(item: Item, rounds: number): CompletionData {
    return { loadKg: item.loadKg ?? undefined, setsCompleted: rounds, repsCompleted: item.reps ?? "" };
  }

  async function markQuick(item: Item, rounds: number) {
    setBusy(true);
    try {
      await markDone(item, prescribedData(item, rounds));
    } finally {
      setBusy(false);
    }
  }

  async function markAllPending() {
    setBusy(true);
    try {
      // Um por vez: cada marcação grava no mesmo registro do treino.
      for (const block of blocks) {
        for (const item of block.items) {
          if (done[item.id]) continue;
          await markDone(item, prescribedData(item, block.rounds));
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const allDone = allItems.length > 0 && allItems.every((i) => done[i.id]);

  return (
    <div className="flex flex-col gap-3">
      {(title || (!allDone && allItems.length > 0)) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h1 className="font-display text-xl">{title}</h1>}
          {!allDone && allItems.length > 0 && (
            <DoneIconButton
              text={busy ? "Salvando…" : "Marcar tudo como feito"}
              disabled={busy}
              onClick={markAllPending}
              className="ml-auto"
            />
          )}
        </div>
      )}

      {finished && (
        <Panel className="text-center">
          <p className="mb-1 font-display text-2xl">Treino concluído 💪</p>
          <p className="text-sm text-[var(--muted)]">
            Bom trabalho — seu personal vai receber seu feedback. Os exercícios ficam marcados até a próxima semana.
          </p>
        </Panel>
      )}

      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          done={done}
          busy={busy}
          onDone={markDone}
          onQuickDone={markQuick}
        />
      ))}

      {finished ? (
        <Button className="mt-2" disabled>
          <Check className="h-4 w-4" /> Treino finalizado
        </Button>
      ) : (
        <Button className="mt-2" disabled={!allDone} onClick={() => setFinished(true)}>
          <Check className="h-4 w-4" /> Finalizar treino
        </Button>
      )}
    </div>
  );
}

function LoadSuggestionBadge({ item }: { item: Item }) {
  if (!item.suggestedLoadKg || !item.loadSuggestionRationale) return null;

  const last = item.lastLoadKg ?? 0;
  const Icon = item.suggestedLoadKg > last ? TrendingUp : item.suggestedLoadKg < last ? TrendingDown : Minus;

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
      <span>
        Sugestão: <span className="font-medium text-[var(--fg)]">{item.suggestedLoadKg}kg</span> — {item.loadSuggestionRationale}
      </span>
    </div>
  );
}

function BlockCard({
  block, done, busy, onDone, onQuickDone,
}: {
  block: Block;
  done: Record<string, boolean>;
  busy: boolean;
  onDone: (item: Item, data: CompletionData) => void;
  onQuickDone: (item: Item, rounds: number) => void;
}) {
  const isMultiExercise = block.items.length > 1;
  const blockDone = block.items.length > 0 && block.items.every((i) => done[i.id]);

  return (
    <Panel className={blockDone ? "opacity-60" : ""}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant={block.seriesType === "simples" ? "outline" : "default"}>
          {SERIES_TYPE_LABEL[block.seriesType]}
        </Badge>
        <span className="text-xs text-[var(--muted)]">
          {block.rounds}x {block.restSeconds ? `· descanso ${block.restSeconds}s` : ""}
        </span>
        {!blockDone && !isMultiExercise && block.items[0] && (
          <DoneIconButton
            text="Marcar feito"
            disabled={busy}
            onClick={() => onQuickDone(block.items[0], block.rounds)}
            className="ml-auto"
          />
        )}
      </div>

      {block.notes && <p className="mb-3 text-xs text-[var(--muted)]">{toDisplayText(block.notes)}</p>}

      <div className={isMultiExercise ? "flex flex-col gap-3 border-l-2 border-[var(--border)] pl-3" : ""}>
        {block.items.map((item) => (
          <ExerciseRow
            key={item.id}
            item={item}
            blockRestSeconds={block.restSeconds}
            blockRounds={block.rounds}
            completed={!!done[item.id]}
            busy={busy}
            onDone={(data) => onDone(item, data)}
            onQuickDone={isMultiExercise ? () => onQuickDone(item, block.rounds) : undefined}
          />
        ))}
      </div>
    </Panel>
  );
}

function ExerciseRow({
  item, blockRestSeconds, blockRounds, completed, busy, onDone, onQuickDone,
}: {
  item: Item;
  blockRestSeconds: number | null;
  blockRounds: number;
  completed: boolean;
  busy: boolean;
  onDone: (data: CompletionData) => void;
  onQuickDone?: () => void;
}) {
  return (
    <div className={completed ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Miniatura com o gif/vídeo do exercício — clicar abre só a informação (gif + instruções) */}
          <ExerciseInfoTrigger item={item}>
            <div className="tf-tap cursor-pointer">
              <ExerciseThumbnail item={item} />
            </div>
          </ExerciseInfoTrigger>
          <div>
            <p className="font-medium">{item.exerciseName}</p>
            <p className="text-xs text-[var(--muted)]">
              {item.holdSeconds ? `${item.holdSeconds}s de sustentação` : item.reps ? `${item.reps} repetições` : "—"}
              {item.loadKg ? ` · ${item.loadKg}kg` : ""} · {MUSCLE_GROUP_LABEL[item.muscleGroup as MuscleGroup] ?? toDisplayText(item.muscleGroup)}
            </p>
          </div>
        </div>

        {!completed && onQuickDone && (
          <DoneIconButton text="Marcar feito" disabled={busy} onClick={onQuickDone} />
        )}
      </div>

      {item.setsDetail && item.setsDetail.length > 0 && (
        <div className="mt-2 flex flex-col gap-1 rounded-[var(--radius)] bg-[var(--background)] p-2 text-xs">
          {item.setsDetail.map((row) => (
            <div key={row.setNumber} className="flex items-center justify-between">
              <span className="text-[var(--muted)]">{row.label || `Série ${row.setNumber}`}</span>
              <span>
                {row.holdSeconds ? `${row.holdSeconds}s` : row.reps ?? "—"}
                {row.loadKg != null ? ` · ${row.loadKg}kg` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {!completed && <LoadSuggestionBadge item={item} />}

      {completed ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--primary)]">
          <Check className="h-4 w-4" /> Exercício concluído
        </div>
      ) : (
        <ExerciseExecutionTrigger item={item} blockRestSeconds={blockRestSeconds} blockRounds={blockRounds} onComplete={onDone}>
          <Button size="sm" className="mt-3 w-full">
            <Play className="h-4 w-4" /> Executar exercício
          </Button>
        </ExerciseExecutionTrigger>
      )}
    </div>
  );
}
