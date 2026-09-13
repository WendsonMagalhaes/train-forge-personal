"use client";

import { useState } from "react";
import { logWorkoutCompletion, logExerciseFeedback } from "@/lib/actions/student-workout";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { SERIES_TYPE_LABEL, type SeriesType } from "@/lib/constants";
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
  lastRpe?: number | null;
  suggestedLoadKg?: number | null;
  loadSuggestionRationale?: string | null;
  substitutes?: SubstituteExercise[];
};

type Block = {
  id: string;
  seriesType: SeriesType;
  rounds: number;
  restSeconds: number | null;
  notes: string | null;
  items: Item[];
};

type CompletionData = { loadKg?: string; setsCompleted: number; repsCompleted: string };

export function TodayWorkoutClient({ planId, blocks }: { planId: string; blocks: Block[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);

  const allItems = blocks.flatMap((b) => b.items);

  async function ensureLog() {
    if (logId) return logId;
    const res = await logWorkoutCompletion(planId, "moderado", "");
    setLogId(res.logId);
    return res.logId;
  }

  async function markDone(item: Item, data: CompletionData) {
    const id = await ensureLog();
    await logExerciseFeedback(id, item.id, { ...data, difficultyRpe: 7 });
    setDone((d) => ({ ...d, [item.id]: true }));
  }

  if (finished) {
    return (
      <Panel className="text-center">
        <p className="font-display text-2xl mb-1">Treino concluído 💪</p>
        <p className="text-sm text-[var(--muted)]">Bom trabalho — seu personal vai receber seu feedback.</p>
      </Panel>
    );
  }

  const allDone = allItems.length > 0 && allItems.every((i) => done[i.id]);

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => (
        <BlockCard key={block.id} block={block} done={done} onDone={markDone} />
      ))}

      <Button className="mt-2" disabled={!allDone} onClick={() => setFinished(true)}>
        <Check className="h-4 w-4" /> Finalizar treino
      </Button>
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
  block, done, onDone,
}: { block: Block; done: Record<string, boolean>; onDone: (item: Item, data: CompletionData) => void }) {
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
      </div>

      {block.notes && <p className="mb-3 text-xs text-[var(--muted)]">{block.notes}</p>}

      <div className={isMultiExercise ? "flex flex-col gap-3 border-l-2 border-[var(--border)] pl-3" : ""}>
        {block.items.map((item) => (
          <ExerciseRow
            key={item.id}
            item={item}
            blockRestSeconds={block.restSeconds}
            blockRounds={block.rounds}
            completed={!!done[item.id]}
            onDone={(data) => onDone(item, data)}
          />
        ))}
      </div>
    </Panel>
  );
}

function ExerciseRow({
  item, blockRestSeconds, blockRounds, completed, onDone,
}: {
  item: Item;
  blockRestSeconds: number | null;
  blockRounds: number;
  completed: boolean;
  onDone: (data: CompletionData) => void;
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
              {item.loadKg ? ` · ${item.loadKg}kg` : ""} · {item.muscleGroup}
            </p>
          </div>
        </div>
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
