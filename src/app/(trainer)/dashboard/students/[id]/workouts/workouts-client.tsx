"use client";

import { useState, useTransition, useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createCycle, deleteCycle, setActiveCycle,
  createPlan, deletePlan,
  createBlockWithExercises, updateBlock, deleteBlock, removeBlockExercise,
  type CreateBlockInput,
} from "@/lib/actions/workouts";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";
import { useToast } from "@/components/ui/toast";
import {
  WEEKDAY_OPTIONS, MUSCLE_GROUP_LABEL, type MuscleGroup,
  SERIES_TYPE_OPTIONS, SERIES_TYPE_LABEL, SERIES_TYPE_EXERCISE_COUNT,
  SERIES_TYPES_WITH_SET_DETAIL, SERIES_TYPES_TIME_BASED, type SeriesType,
} from "@/lib/constants";
import { Plus, Trash2, Pencil, Dumbbell, GripVertical } from "lucide-react";
import { WorkoutSummarySidebar } from "./workout-summary-sidebar";

type FormState = { error?: string; success?: boolean };

type SetDetailRow = {
  setNumber: number;
  label?: string;
  reps?: string;
  loadKg?: number;
  restSeconds?: number;
  holdSeconds?: number;
};

type BlockItem = {
  id: string;
  reps: string | null;
  loadKg: string | null;
  tempo: string | null;
  holdSeconds: number | null;
  notes: string | null;
  setsDetail: SetDetailRow[] | null;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  muscleGroupDetail: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
};

type Block = {
  id: string;
  seriesType: SeriesType;
  rounds: number;
  restSeconds: number | null;
  notes: string | null;
  exercises: BlockItem[];
};

type Plan = { id: string; label: string; weekdays: string | null; blocks: Block[] };
type Cycle = {
  id: string; name: string; goal: string | null; startDate: string; endDate: string | null;
  isActive: boolean | null; plans: Plan[];
};
export type ExerciseLib = {
  id: string; name: string; muscleGroup: string; muscleGroupDetail: string | null;
  imageUrl: string | null; videoUrl: string | null;
};

const WEEKDAY_LABEL = Object.fromEntries(WEEKDAY_OPTIONS.map((w) => [w.value, w.label]));

export function WorkoutsClient({
  studentId, cycles, exerciseLibrary,
}: { studentId: string; cycles: Cycle[]; exerciseLibrary: ExerciseLib[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Ciclos de treino</h2>
          <NewCycleButton studentId={studentId} onDone={refresh} />
        </div>

        {cycles.length === 0 && (
          <Panel>
            <p className="text-sm text-[var(--muted)]">
              Nenhum ciclo criado ainda. Crie um ciclo (mesociclo) para começar a montar as fichas de treino.
            </p>
          </Panel>
        )}

        {cycles.map((cycle) => (
          <CycleCard key={cycle.id} studentId={studentId} cycle={cycle} exerciseLibrary={exerciseLibrary} onChange={refresh} />
        ))}
      </div>

      <WorkoutSummarySidebar cycles={cycles} />
    </div>
  );
}

function NewCycleButton({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      size="lg"
      title="Novo ciclo"
      description="Um mesociclo/bloco de treino (ex: 4 a 8 semanas)."
      trigger={<Button><Plus className="h-4 w-4" />Novo ciclo</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => <NewCycleForm studentId={studentId} onSuccess={() => { setOpen(false); onDone(); }} />}
    </Dialog>
  );
}

function NewCycleForm({ studentId, onSuccess }: { studentId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await createCycle(studentId, formData)) ?? {},
    undefined
  );
  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Ciclo criado." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Nome do ciclo</Label>
        <Input id="name" name="name" placeholder="Bloco 1 — Hipertrofia" required />
      </div>
      <div>
        <Label htmlFor="goal">Objetivo do ciclo</Label>
        <Input id="goal" name="goal" placeholder="Ganho de massa muscular" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Início</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
        <div>
          <Label htmlFor="endDate">Fim (opcional)</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">Criar um novo ciclo desativa automaticamente o ciclo ativo anterior.</p>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar ciclo"}</Button>
      </div>
    </form>
  );
}

function CycleCard({
  studentId, cycle, exerciseLibrary, onChange,
}: { studentId: string; cycle: Cycle; exerciseLibrary: ExerciseLib[]; onChange: () => void }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Panel>
      <PanelHeader>
        <div className="flex items-center gap-2">
          <PanelTitle>{cycle.name}</PanelTitle>
          {cycle.isActive && <Badge variant="success">Ativo</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {!cycle.isActive && (
            <Button
              size="sm" variant="secondary" disabled={pending}
              onClick={() => startTransition(async () => {
                await setActiveCycle(studentId, cycle.id);
                toast({ variant: "success", description: `"${cycle.name}" agora é o ciclo ativo.` });
                onChange();
              })}
            >
              Ativar
            </Button>
          )}
          <ConfirmDeleteButton
            itemLabel={cycle.name}
            trigger={<button className="text-[var(--muted)] hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
            onConfirm={async () => { await deleteCycle(studentId, cycle.id); onChange(); }}
          />
        </div>
      </PanelHeader>

      <p className="mb-4 text-xs text-[var(--muted)]">
        {cycle.goal ? `${cycle.goal} · ` : ""}
        {cycle.startDate}{cycle.endDate ? ` – ${cycle.endDate}` : ""}
      </p>

      <div className="flex flex-col gap-4">
        {cycle.plans.map((plan) => (
          <PlanCard key={plan.id} studentId={studentId} plan={plan} exerciseLibrary={exerciseLibrary} onChange={onChange} />
        ))}
        <NewPlanButton studentId={studentId} cycleId={cycle.id} onDone={onChange} />
      </div>
    </Panel>
  );
}

function NewPlanButton({ studentId, cycleId, onDone }: { studentId: string; cycleId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      size="lg"
      title="Nova ficha de treino"
      trigger={<Button variant="secondary" size="sm"><Plus className="h-4 w-4" />Nova ficha</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => <NewPlanForm studentId={studentId} cycleId={cycleId} onSuccess={() => { setOpen(false); onDone(); }} />}
    </Dialog>
  );
}

function NewPlanForm({ studentId, cycleId, onSuccess }: { studentId: string; cycleId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await createPlan(studentId, cycleId, formData)) ?? {},
    undefined
  );
  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Ficha criada." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="label">Nome da ficha</Label>
        <Input id="label" name="label" placeholder="Treino A — Peito/Tríceps" required />
      </div>
      <div>
        <Label>Dias da semana</Label>
        <MultiSelect name="weekdays" options={WEEKDAY_OPTIONS} placeholder="Selecione os dias" />
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Criando…" : "Criar ficha"}</Button>
      </div>
    </form>
  );
}

function ExerciseThumb({ item }: { item: { imageUrl: string | null; name: string } }) {
  if (item.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt={item.name} className="h-10 w-10 shrink-0 rounded-[var(--radius)] object-cover" />;
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--background)]">
      <Dumbbell className="h-4 w-4 text-[var(--muted)]" />
    </div>
  );
}

function PlanCard({
  studentId, plan, exerciseLibrary, onChange,
}: { studentId: string; plan: Plan; exerciseLibrary: ExerciseLib[]; onChange: () => void }) {
  const days = (plan.weekdays || "").split(",").filter(Boolean);
  const { toast } = useToast();

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{plan.label}</p>
          {days.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {days.map((d) => <Badge key={d} variant="outline">{WEEKDAY_LABEL[d] ?? d}</Badge>)}
            </div>
          )}
        </div>
        <ConfirmDeleteButton
          itemLabel={plan.label}
          trigger={<button className="text-[var(--muted)] hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
          onConfirm={async () => { await deletePlan(studentId, plan.id); onChange(); }}
        />
      </div>

      {plan.blocks.length === 0 ? (
        <p className="mb-3 text-xs text-[var(--muted)]">Nenhum exercício adicionado.</p>
      ) : (
        <div className="mb-3 flex flex-col gap-2">
          {plan.blocks.map((block, i) => (
            <BlockRow
              key={block.id}
              studentId={studentId}
              block={block}
              index={i}
              onChange={onChange}
            />
          ))}
        </div>
      )}

      {exerciseLibrary.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">
          Cadastre exercícios na <a href="/dashboard/exercises" className="text-[var(--primary)]">biblioteca</a> para adicioná-los aqui.
        </p>
      ) : (
        <AddBlockButton studentId={studentId} planId={plan.id} exerciseLibrary={exerciseLibrary} onDone={() => { onChange(); toast({ variant: "success", description: "Bloco adicionado à ficha." }); }} />
      )}
    </div>
  );
}

function BlockRow({
  studentId, block, index, onChange,
}: { studentId: string; block: Block; index: number; onChange: () => void }) {
  const { min } = SERIES_TYPE_EXERCISE_COUNT[block.seriesType];
  const isMulti = block.exercises.length > 1;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-[var(--muted)]" />
          <Badge variant={block.seriesType === "simples" ? "outline" : "default"}>
            {index + 1}. {SERIES_TYPE_LABEL[block.seriesType]}
          </Badge>
          <span className="text-xs text-[var(--muted)]">
            {block.rounds}x {block.restSeconds ? `· ${block.restSeconds}s desc.` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <EditBlockButton studentId={studentId} block={block} onChange={onChange} />
          <ConfirmDeleteButton
            itemLabel={SERIES_TYPE_LABEL[block.seriesType]}
            trigger={<button className="text-[var(--muted)] hover:text-red-500" type="button"><Trash2 className="h-3.5 w-3.5" /></button>}
            onConfirm={async () => { await deleteBlock(studentId, block.id); onChange(); }}
          />
        </div>
      </div>

      {block.notes && <p className="mb-2 text-xs text-[var(--muted)]">{block.notes}</p>}

      <div className={isMulti ? "flex flex-col gap-2 border-l-2 border-[var(--border)] pl-3" : "flex flex-col gap-2"}>
        {block.exercises.map((ex) => (
          <div key={ex.id} className="flex items-center gap-2">
            <ExerciseThumb item={{ imageUrl: ex.imageUrl, name: ex.exerciseName }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{ex.exerciseName}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {ex.holdSeconds ? `${ex.holdSeconds}s` : ex.reps || "—"}
                {ex.loadKg ? ` · ${ex.loadKg}kg` : ""}
                {ex.tempo ? ` · tempo ${ex.tempo}` : ""}
                {ex.setsDetail && ex.setsDetail.length > 0 ? ` · ${ex.setsDetail.length} séries detalhadas` : ""}
              </p>
            </div>
            {block.exercises.length > min && (
              <button
                type="button"
                className="shrink-0 text-[var(--muted)] hover:text-red-500"
                onClick={async () => { await removeBlockExercise(studentId, ex.id); onChange(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditBlockButton({
  studentId, block, onChange,
}: { studentId: string; block: Block; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [rounds, setRounds] = useState(String(block.rounds));
  const [restSeconds, setRestSeconds] = useState(block.restSeconds ? String(block.restSeconds) : "");
  const [notes, setNotes] = useState(block.notes ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateBlock(studentId, block.id, {
        rounds: Number(rounds) || 1,
        restSeconds: restSeconds ? Number(restSeconds) : undefined,
        notes: notes || undefined,
      });

      if (!res.success) {
        toast({
          variant: "error",
          description: "Não foi possível atualizar o bloco.",
        });
      } else {
        toast({
          variant: "success",
          description: "Bloco atualizado.",
        });
        setOpen(false);
        onChange();
      }
    });
  }

  return (
    <Dialog
      title="Editar bloco"
      description={SERIES_TYPE_LABEL[block.seriesType]}
      trigger={<button className="text-[var(--muted)] hover:text-[var(--primary)]" type="button"><Pencil className="h-3.5 w-3.5" /></button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="edit-rounds">Séries</Label>
            <Input id="edit-rounds" type="number" min={1} value={rounds} onChange={(e) => setRounds(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-rest">Descanso entre séries (segundos)</Label>
            <Input id="edit-rest" type="number" min={0} value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} placeholder="Opcional" />
          </div>
          <div>
            <Label htmlFor="edit-notes">Observações</Label>
            <Input id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
          <Button onClick={save} disabled={pending}>{pending ? "Salvando…" : "Salvar"}</Button>
        </div>
      )}
    </Dialog>
  );
}

function AddBlockButton({
  studentId, planId, exerciseLibrary, onDone,
}: { studentId: string; planId: string; exerciseLibrary: ExerciseLib[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      size="lg"
      title="Adicionar bloco à ficha"
      description="Escolha o tipo de série e os exercícios que fazem parte dele."
      trigger={<Button size="sm" variant="secondary"><Plus className="h-3.5 w-3.5" />Adicionar bloco</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <AddBlockForm
          studentId={studentId}
          planId={planId}
          exerciseLibrary={exerciseLibrary}
          onSuccess={() => { setOpen(false); onDone(); }}
        />
      )}
    </Dialog>
  );
}

type SlotState = {
  key: string;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  search: string;
  reps: string;
  loadKg: string;
  tempo: string;
  holdSeconds: string;
  notes: string;
};

function emptySlot(): SlotState {
  return {
    key: Math.random().toString(36).slice(2),
    exerciseId: "", exerciseName: "", imageUrl: null, search: "",
    reps: "", loadKg: "", tempo: "", holdSeconds: "", notes: "",
  };
}

function AddBlockForm({
  studentId, planId, exerciseLibrary, onSuccess,
}: { studentId: string; planId: string; exerciseLibrary: ExerciseLib[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [seriesType, setSeriesType] = useState<SeriesType>("simples");
  const { min, max } = SERIES_TYPE_EXERCISE_COUNT[seriesType];
  const hasSetDetail = SERIES_TYPES_WITH_SET_DETAIL.includes(seriesType);
  const isTimeBased = SERIES_TYPES_TIME_BASED.includes(seriesType);
  const canAddRemoveSlots = max > min;

  const [rounds, setRounds] = useState("3");
  const [restSeconds, setRestSeconds] = useState("60");
  const [blockNotes, setBlockNotes] = useState("");

  const [slots, setSlots] = useState<SlotState[]>([emptySlot()]);
  const [setsRows, setSetsRows] = useState<{ setNumber: number; label: string; reps: string; loadKg: string; holdSeconds: string }[]>([
    { setNumber: 1, label: "", reps: "", loadKg: "", holdSeconds: "" },
  ]);

  function changeSeriesType(next: SeriesType) {
    setSeriesType(next);
    const { min: nextMin, max: nextMax } = SERIES_TYPE_EXERCISE_COUNT[next];
    setSlots((prev) => {
      const clamped = [...prev];
      while (clamped.length < nextMin) clamped.push(emptySlot());
      while (clamped.length > nextMax) clamped.pop();
      return clamped;
    });
  }

  function updateSlot(key: string, patch: Partial<SlotState>) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function addSlot() {
    setSlots((prev) => (prev.length < max ? [...prev, emptySlot()] : prev));
  }

  function removeSlot(key: string) {
    setSlots((prev) => (prev.length > min ? prev.filter((s) => s.key !== key) : prev));
  }

  function addSetRow() {
    setSetsRows((prev) => [...prev, { setNumber: prev.length + 1, label: "", reps: "", loadKg: "", holdSeconds: "" }]);
  }

  function removeSetRow(idx: number) {
    setSetsRows((prev) => prev.filter((_, i) => i !== idx).map((row, i) => ({ ...row, setNumber: i + 1 })));
  }

  function updateSetRow(idx: number, patch: Partial<(typeof setsRows)[number]>) {
    setSetsRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function submit() {
    setError(null);

    if (slots.some((s) => !s.exerciseId)) {
      setError("Selecione um exercício em cada campo.");
      return;
    }

    const parsedRounds = hasSetDetail ? setsRows.length : Number(rounds);
    if (!parsedRounds || parsedRounds < 1) {
      setError("Informe um número válido de séries.");
      return;
    }

    const setsDetail = hasSetDetail
      ? setsRows.map((row) => ({
        setNumber: row.setNumber,
        label: row.label || undefined,
        reps: isTimeBased ? undefined : row.reps || undefined,
        loadKg: row.loadKg ? Number(row.loadKg) : undefined,
        holdSeconds: row.holdSeconds ? Number(row.holdSeconds) : undefined,
      }))
      : undefined;

    const payload: CreateBlockInput = {
      seriesType,
      rounds: parsedRounds,
      restSeconds: restSeconds ? Number(restSeconds) : undefined,
      notes: blockNotes || undefined,
      exercises: slots.map((s, i) => ({
        exerciseId: s.exerciseId,
        reps: isTimeBased ? undefined : s.reps || undefined,
        loadKg: s.loadKg ? Number(s.loadKg) : undefined,
        tempo: s.tempo || undefined,
        holdSeconds: isTimeBased && s.holdSeconds ? Number(s.holdSeconds) : undefined,
        notes: s.notes || undefined,
        setsDetail: i === 0 ? setsDetail : undefined,
      })),
    };

    startTransition(async () => {
      const res = await createBlockWithExercises(studentId, planId, payload);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({ variant: "success", description: "Bloco adicionado." });
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="seriesType">Tipo de série</Label>
        <select
          id="seriesType"
          value={seriesType}
          onChange={(e) => changeSeriesType(e.target.value as SeriesType)}
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          {SERIES_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {SERIES_TYPE_OPTIONS.find((o) => o.value === seriesType)?.description}
        </p>
      </div>

      {!hasSetDetail && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="rounds">{max > 1 ? "Rodadas" : "Séries"}</Label>
            <Input id="rounds" type="number" min={1} value={rounds} onChange={(e) => setRounds(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="restSeconds">Descanso (s)</Label>
            <Input id="restSeconds" type="number" min={0} value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
          </div>
        </div>
      )}

      {hasSetDetail && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label>Séries detalhadas</Label>
            <Button type="button" size="sm" variant="secondary" onClick={addSetRow}>
              <Plus className="h-3.5 w-3.5" /> Série
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {setsRows.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] p-2">
                <span className="w-5 shrink-0 text-center text-xs text-[var(--muted)]">{row.setNumber}</span>
                <Input
                  placeholder="Rótulo (opcional)"
                  value={row.label}
                  onChange={(e) => updateSetRow(i, { label: e.target.value })}
                  className="h-8 text-xs"
                />
                {isTimeBased ? (
                  <Input
                    placeholder="segundos"
                    type="number"
                    value={row.holdSeconds}
                    onChange={(e) => updateSetRow(i, { holdSeconds: e.target.value })}
                    className="h-8 w-24 text-xs"
                  />
                ) : (
                  <Input
                    placeholder="reps"
                    value={row.reps}
                    onChange={(e) => updateSetRow(i, { reps: e.target.value })}
                    className="h-8 w-20 text-xs"
                  />
                )}
                <Input
                  placeholder="kg"
                  type="number"
                  step="0.5"
                  value={row.loadKg}
                  onChange={(e) => updateSetRow(i, { loadKg: e.target.value })}
                  className="h-8 w-20 text-xs"
                />
                {setsRows.length > 1 && (
                  <button type="button" onClick={() => removeSetRow(i)} className="shrink-0 text-[var(--muted)] hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="restSeconds2">Descanso entre séries (s)</Label>
              <Input id="restSeconds2" type="number" min={0} value={restSeconds} onChange={(e) => setRestSeconds(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="blockNotes">Observações do bloco (opcional)</Label>
        <Input id="blockNotes" value={blockNotes} onChange={(e) => setBlockNotes(e.target.value)} placeholder="Ex: priorizar amplitude total" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>{max > 1 ? `Exercícios (${slots.length}${max !== min ? `/${max}` : ""})` : "Exercício"}</Label>
          {canAddRemoveSlots && slots.length < max && (
            <Button type="button" size="sm" variant="secondary" onClick={addSlot}>
              <Plus className="h-3.5 w-3.5" /> Exercício
            </Button>
          )}
        </div>

        {slots.map((slot, i) => (
          <ExerciseSlotField
            key={slot.key}
            index={i}
            slot={slot}
            isTimeBased={isTimeBased}
            showBaseFields={!hasSetDetail || i > 0}
            exerciseLibrary={exerciseLibrary}
            onChange={(patch) => updateSlot(slot.key, patch)}
            onRemove={canAddRemoveSlots && slots.length > min ? () => removeSlot(slot.key) : undefined}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end pt-1">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Adicionando…" : "Adicionar bloco"}
        </Button>
      </div>
    </div>
  );
}

function ExerciseSlotField({
  index, slot, exerciseLibrary, onChange, onRemove, isTimeBased, showBaseFields,
}: {
  index: number;
  slot: SlotState;
  exerciseLibrary: ExerciseLib[];
  onChange: (patch: Partial<SlotState>) => void;
  onRemove?: () => void;
  isTimeBased: boolean;
  showBaseFields: boolean;
}) {
  const options: AutocompleteOption[] = useMemo(() => {
    const q = slot.search.trim().toLowerCase();
    if (!q) return [];
    return exerciseLibrary
      .filter((ex) => ex.name.toLowerCase().includes(q))
      .slice(0, 30)
      .map((ex) => ({
        id: ex.id,
        label: ex.name,
        sublabel: MUSCLE_GROUP_LABEL[ex.muscleGroup as MuscleGroup] ?? ex.muscleGroupDetail ?? "",
      }));
  }, [slot.search, exerciseLibrary]);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--muted)]">Exercício {index + 1}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-[var(--muted)] hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {slot.exerciseId ? (
        <div className="mb-2 flex items-center gap-2 rounded-[var(--radius)] bg-[var(--background)] p-2">
          <ExerciseThumb item={{ imageUrl: slot.imageUrl, name: slot.exerciseName }} />
          <p className="truncate text-sm">{slot.exerciseName}</p>
          <button
            type="button"
            className="ml-auto shrink-0 text-xs text-[var(--primary)]"
            onClick={() => onChange({ exerciseId: "", exerciseName: "", imageUrl: null, search: "" })}
          >
            Trocar
          </button>
        </div>
      ) : (
        <Autocomplete
          value={slot.search}
          onValueChange={(v) => onChange({ search: v })}
          options={options}
          placeholder="Buscar exercício pelo nome…"
          onSelect={(opt) => {
            const ex = exerciseLibrary.find((e) => e.id === opt.id);
            onChange({ exerciseId: opt.id, exerciseName: opt.label, imageUrl: ex?.imageUrl ?? null, search: opt.label });
          }}
        />
      )}

      {showBaseFields && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {isTimeBased ? (
            <div>
              <Label className="text-xs">Segundos</Label>
              <Input type="number" value={slot.holdSeconds} onChange={(e) => onChange({ holdSeconds: e.target.value })} className="h-9" />
            </div>
          ) : (
            <div>
              <Label className="text-xs">Repetições</Label>
              <Input placeholder="8-12" value={slot.reps} onChange={(e) => onChange({ reps: e.target.value })} className="h-9" />
            </div>
          )}
          <div>
            <Label className="text-xs">Carga (kg)</Label>
            <Input type="number" step="0.5" value={slot.loadKg} onChange={(e) => onChange({ loadKg: e.target.value })} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Tempo</Label>
            <Input placeholder="2-0-2" value={slot.tempo} onChange={(e) => onChange({ tempo: e.target.value })} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Obs.</Label>
            <Input value={slot.notes} onChange={(e) => onChange({ notes: e.target.value })} className="h-9" />
          </div>
        </div>
      )}
    </div>
  );
}
