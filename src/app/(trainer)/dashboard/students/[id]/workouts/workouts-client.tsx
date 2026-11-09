"use client";
import { sanitizeDecimalInput, sanitizeIntInput } from "@/lib/numbers";
import { toDisplayText } from "@/lib/text-case";
import { NumberInput } from "@/components/ui/number-input";

import { useState, useTransition, useActionState, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  createCycle, deleteCycle, setActiveCycle,
  createPlan, deletePlan,
  createBlockWithExercises, createBlocksWithExercises, updateBlock, updateBlockExercise, deleteBlock, removeBlockExercise,
  type CreateBlockInput,
} from "@/lib/actions/workouts";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Collapsible } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChipMultiSelect } from "@/components/ui/chip-select";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";
import { useToast } from "@/components/ui/toast";
import {
  WEEKDAY_OPTIONS, MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, type MuscleGroup,
  SERIES_TYPE_OPTIONS, SERIES_TYPE_LABEL, SERIES_TYPE_EXERCISE_COUNT,
  SERIES_TYPES_WITH_SET_DETAIL, SERIES_TYPES_TIME_BASED, type SeriesType,
} from "@/lib/constants";
import { sortPlansByWeekday } from "@/lib/workout-schedule";
import { Plus, Trash2, Pencil, Dumbbell, GripVertical, X } from "lucide-react";
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
          <PanelTitle>{toDisplayText(cycle.name)}</PanelTitle>
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
            trigger={<button className="tf-tap flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-red-500" type="button" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>}
            onConfirm={async () => { await deleteCycle(studentId, cycle.id); onChange(); }}
          />
        </div>
      </PanelHeader>

      <p className="mb-4 text-xs text-[var(--muted)]">
        {cycle.goal ? `${toDisplayText(cycle.goal)} · ` : ""}
        {cycle.startDate}{cycle.endDate ? ` – ${cycle.endDate}` : ""}
      </p>

      <div className="flex flex-col gap-4">
        {sortPlansByWeekday(cycle.plans).map((plan) => (
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

const MUSCLE_OPTIONS = MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_GROUP_LABEL[m] }));

function NewPlanForm({ studentId, cycleId, onSuccess }: { studentId: string; cycleId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await createPlan(studentId, cycleId, formData)) ?? {},
    undefined
  );
  const [muscles, setMuscles] = useState<string[]>([]);          // grupos do catálogo
  const [customMuscles, setCustomMuscles] = useState<string[]>([]); // grupos digitados pelo personal
  const [customInput, setCustomInput] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [label, setLabel] = useState("");
  const [labelEdited, setLabelEdited] = useState(false);

  // Os grupos escolhidos viram o nome da ficha (ex: "Peito/Tríceps").
  // Depois que o personal edita o nome manualmente, paramos de sobrescrevê-lo.
  function buildLabel(presets: string[], custom: string[]) {
    return [...presets.map((m) => MUSCLE_GROUP_LABEL[m as MuscleGroup]), ...custom].join("/");
  }

  function updateMuscles(next: string[]) {
    setMuscles(next);
    if (!labelEdited) setLabel(buildLabel(next, customMuscles));
  }

  function addCustomMuscle() {
    const name = customInput.trim();
    if (!name) return;
    setCustomInput("");
    const alreadyExists = [...MUSCLE_OPTIONS.map((o) => o.label), ...customMuscles]
      .some((n) => n.toLowerCase() === name.toLowerCase());
    if (alreadyExists) return;
    const next = [...customMuscles, name];
    setCustomMuscles(next);
    if (!labelEdited) setLabel(buildLabel(muscles, next));
  }

  function removeCustomMuscle(name: string) {
    const next = customMuscles.filter((n) => n !== name);
    setCustomMuscles(next);
    if (!labelEdited) setLabel(buildLabel(muscles, next));
  }

  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Ficha criada." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <Label>Músculos</Label>
        <ChipMultiSelect
          ariaLabel="Músculos"
          options={MUSCLE_OPTIONS}
          value={muscles}
          onChange={updateMuscles}
        />

        {/* Grupos digitados à mão — entram no nome da ficha, como os do catálogo */}
        <div className="mt-3 flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomMuscle(); } }}
            placeholder="Outro grupo (ex: Antebraço)"
            enterKeyHint="done"
            className="h-10"
          />
          <Button type="button" variant="secondary" onClick={addCustomMuscle} disabled={!customInput.trim()} className="h-10 shrink-0 px-3">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {customMuscles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customMuscles.map((name) => (
              <span
                key={name}
                className="flex min-h-9 items-center gap-1 rounded-[var(--radius)] border border-[var(--primary)] bg-[var(--background)] pl-2.5 pr-1 text-sm"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeCustomMuscle(name)}
                  aria-label={`Remover ${name}`}
                  className="tf-tap flex h-7 w-7 items-center justify-center text-[var(--muted)] hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="label">Nome da ficha</Label>
        <Input
          id="label" name="label" value={label}
          onChange={(e) => { setLabel(e.target.value); setLabelEdited(true); }}
          placeholder="Ex: Peito/Tríceps ou Treino A" required
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Preenchido com os músculos escolhidos; pode ser editado.</p>
      </div>

      <div>
        <Label>Dias da semana</Label>
        <ChipMultiSelect
          name="weekdays"
          ariaLabel="Dias da semana"
          options={WEEKDAY_OPTIONS}
          value={weekdays}
          onChange={setWeekdays}
          className="grid grid-cols-4 gap-2 sm:grid-cols-7"
        />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Criando…" : "Criar ficha"}</Button>
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

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4">
      <Collapsible
        title={
          <>
            <span className="font-medium">{toDisplayText(plan.label)}</span>
            {days.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {days.map((d) => <Badge key={d} variant="outline">{WEEKDAY_LABEL[d] ?? d}</Badge>)}
              </span>
            )}
          </>
        }
        summary={plan.blocks.length > 0 ? `${plan.blocks.length} ${plan.blocks.length === 1 ? "bloco" : "blocos"}` : "vazia"}
        actions={
          <ConfirmDeleteButton
            itemLabel={plan.label}
            trigger={<button className="tf-tap flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-red-500" type="button" aria-label="Excluir"><Trash2 className="h-4 w-4" /></button>}
            onConfirm={async () => { await deletePlan(studentId, plan.id); onChange(); }}
          />
        }
      >

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
              exerciseLibrary={exerciseLibrary}
            />
          ))}
        </div>
      )}

      {exerciseLibrary.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">
          Cadastre exercícios na <a href="/dashboard/exercises" className="text-[var(--primary)]">biblioteca</a> para adicioná-los aqui.
        </p>
      ) : (
        <AddBlockButton studentId={studentId} planId={plan.id} exerciseLibrary={exerciseLibrary} onDone={onChange} />
      )}
      </Collapsible>
    </div>
  );
}

function BlockRow({
  studentId, block, index, onChange, exerciseLibrary,
}: { studentId: string; block: Block; index: number; onChange: () => void; exerciseLibrary: ExerciseLib[] }) {
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
            trigger={<button className="tf-tap flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-red-500" type="button" aria-label="Excluir bloco"><Trash2 className="h-4 w-4" /></button>}
            onConfirm={async () => { await deleteBlock(studentId, block.id); onChange(); }}
          />
        </div>
      </div>

      {block.notes && <p className="mb-2 text-xs text-[var(--muted)]">{toDisplayText(block.notes)}</p>}

      <div className={isMulti ? "flex flex-col gap-2 border-l-2 border-[var(--border)] pl-3" : "flex flex-col gap-2"}>
        {block.exercises.map((ex) => (
          <div key={ex.id} className="flex items-center gap-2">
            <ExerciseThumb item={{ imageUrl: ex.imageUrl, name: ex.exerciseName }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{toDisplayText(ex.exerciseName)}</p>
              <p className="truncate text-xs text-[var(--muted)]">
                {ex.holdSeconds ? `${ex.holdSeconds}s` : ex.reps || "—"}
                {ex.notes ? ` ${toDisplayText(ex.notes)}` : ""}
                {ex.loadKg ? ` · ${ex.loadKg}kg` : ""}
                {ex.tempo ? ` · tempo ${ex.tempo}` : ""}
                {ex.setsDetail && ex.setsDetail.length > 0 ? ` · ${ex.setsDetail.length} séries detalhadas` : ""}
              </p>
            </div>
            <EditExerciseButton studentId={studentId} block={block} item={ex} exerciseLibrary={exerciseLibrary} onChange={onChange} />
            {/* Sempre visível. Quando o bloco já está no mínimo de exercícios (ex.: série simples),
                excluir o exercício significaria esvaziar o bloco — então o botão exclui o bloco inteiro, com confirmação. */}
            {block.exercises.length > min ? (
              <button
                type="button"
                title="Remover exercício"
                aria-label={`Remover ${ex.exerciseName} do bloco`}
                className="tf-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-red-500"
                onClick={async () => { await removeBlockExercise(studentId, ex.id); onChange(); }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <ConfirmDeleteButton
                itemLabel={`o bloco "${SERIES_TYPE_LABEL[block.seriesType]}"`}
                title="Excluir bloco"
                successMessage="Bloco excluído."
                trigger={
                  <button
                    type="button"
                    title="Excluir bloco"
                    aria-label="Excluir bloco"
                    className="tf-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
                onConfirm={async () => { await deleteBlock(studentId, block.id); onChange(); }}
              />
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
      const res = await updateBlock(studentId, block.id, { rounds, restSeconds, notes });

      if ("error" in res) {
        toast({ variant: "error", description: res.error ?? "Não foi possível atualizar o bloco." });
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
      trigger={<button className="tf-tap flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--primary)]" type="button" aria-label="Editar bloco"><Pencil className="h-4 w-4" /></button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="edit-rounds">Séries</Label>
            <Input id="edit-rounds" inputMode="numeric" value={rounds} onChange={(e) => setRounds(sanitizeIntInput(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="edit-rest">Descanso entre séries (segundos)</Label>
            <Input id="edit-rest" inputMode="numeric" value={restSeconds} onChange={(e) => setRestSeconds(sanitizeIntInput(e.target.value))} placeholder="Opcional" />
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

// Tipos de uma série só (um exercício por bloco): entram nos cards do "Adicionar exercício".
const CARD_SERIES_OPTIONS = SERIES_TYPE_OPTIONS.filter(
  (o) => SERIES_TYPE_EXERCISE_COUNT[o.value].max === 1 && !SERIES_TYPES_WITH_SET_DETAIL.includes(o.value)
);
// Tipos com vários exercícios ou séries detalhadas: ficam no "Bloco avançado".
const COMBINED_SERIES_OPTIONS = SERIES_TYPE_OPTIONS.filter(
  (o) => SERIES_TYPE_EXERCISE_COUNT[o.value].max > 1 || SERIES_TYPES_WITH_SET_DETAIL.includes(o.value)
);

const SELECT_CLASS = "h-9 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]";

function AddBlockButton({
  studentId, planId, exerciseLibrary, onDone,
}: { studentId: string; planId: string; exerciseLibrary: ExerciseLib[]; onDone: () => void }) {
  const [openSimple, setOpenSimple] = useState(false);
  const [openAdvanced, setOpenAdvanced] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog
        size="lg"
        title="Adicionar exercício à ficha"
        description="Cada exercício tem o próprio tipo, séries e descanso. Adicione quantos quiser de uma vez."
        trigger={<Button size="sm"><Plus className="h-3.5 w-3.5" />Adicionar exercício</Button>}
        open={openSimple}
        onOpenChange={setOpenSimple}
      >
        {() => (
          <AddExercisesForm
            studentId={studentId}
            planId={planId}
            exerciseLibrary={exerciseLibrary}
            onSuccess={() => { setOpenSimple(false); onDone(); }}
          />
        )}
      </Dialog>

      <Dialog
        size="lg"
        title="Adicionar bloco avançado"
        description="Bi-set, tri-set, circuito, pirâmide, drop-set e outros tipos com vários exercícios ou séries detalhadas."
        trigger={<Button size="sm" variant="secondary">Bloco avançado</Button>}
        open={openAdvanced}
        onOpenChange={setOpenAdvanced}
      >
        {() => (
          <AddBlockForm
            studentId={studentId}
            planId={planId}
            exerciseLibrary={exerciseLibrary}
            onSuccess={() => { setOpenAdvanced(false); onDone(); }}
          />
        )}
      </Dialog>
    </div>
  );
}

type CardState = SlotState & { seriesType: SeriesType; rounds: string; restSeconds: string };

function emptyCard(): CardState {
  return { ...emptySlot(), seriesType: "simples", rounds: "3", restSeconds: "60" };
}

function AddExercisesForm({
  studentId, planId, exerciseLibrary, onSuccess,
}: { studentId: string; planId: string; exerciseLibrary: ExerciseLib[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CardState[]>([emptyCard()]);

  function updateCard(key: string, patch: Partial<CardState>) {
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function removeCard(key: string) {
    setCards((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  }

  function submit() {
    setError(null);

    if (cards.some((c) => !c.exerciseId)) {
      setError("Selecione um exercício em cada campo.");
      return;
    }

    // Cada card vira um bloco com as próprias séries, descanso e tipo.
    const inputs: CreateBlockInput[] = cards.map((c) => {
      const timed = SERIES_TYPES_TIME_BASED.includes(c.seriesType);
      return {
        seriesType: c.seriesType,
        rounds: c.rounds,
        restSeconds: c.restSeconds || undefined,
        exercises: [{
          exerciseId: c.exerciseId,
          reps: timed ? undefined : c.reps || undefined,
          loadKg: c.loadKg || undefined,
          tempo: c.tempo || undefined,
          holdSeconds: timed && c.holdSeconds ? c.holdSeconds : undefined,
          notes: c.notes || undefined,
        }],
      };
    });

    const count = cards.length;
    startTransition(async () => {
      const res = await createBlocksWithExercises(studentId, planId, inputs);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({ variant: "success", description: count > 1 ? `${count} exercícios adicionados.` : "Exercício adicionado." });
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card, i) => (
        <ExerciseCard
          key={card.key}
          index={i}
          card={card}
          exerciseLibrary={exerciseLibrary}
          onChange={(patch) => updateCard(card.key, patch)}
          onRemove={cards.length > 1 ? () => removeCard(card.key) : undefined}
        />
      ))}

      <Button type="button" variant="secondary" onClick={() => setCards((prev) => [...prev, emptyCard()])} className="w-full">
        <Plus className="h-4 w-4" /> Adicionar outro exercício
      </Button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end pt-1">
        <Button type="button" onClick={submit} disabled={pending} className="w-full sm:w-auto">
          {pending ? "Adicionando…" : cards.length > 1 ? `Adicionar ${cards.length} exercícios` : "Adicionar exercício"}
        </Button>
      </div>
    </div>
  );
}

function ExerciseCard({
  index, card, exerciseLibrary, onChange, onRemove,
}: {
  index: number;
  card: CardState;
  exerciseLibrary: ExerciseLib[];
  onChange: (patch: Partial<CardState>) => void;
  onRemove?: () => void;
}) {
  return (
    <ExerciseSlotField
      index={index}
      slot={card}
      isTimeBased={SERIES_TYPES_TIME_BASED.includes(card.seriesType)}
      showBaseFields
      exerciseLibrary={exerciseLibrary}
      onChange={onChange}
      onRemove={onRemove}
      extra={
        <div className="mb-3 flex flex-col gap-3">
          <div>
            <Label className="text-xs">Tipo de série</Label>
            <select
              value={card.seriesType}
              onChange={(e) => onChange({ seriesType: e.target.value as SeriesType })}
              className={SELECT_CLASS}
            >
              {CARD_SERIES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Séries</Label>
              <Input inputMode="numeric" value={card.rounds} onChange={(e) => onChange({ rounds: sanitizeIntInput(e.target.value) })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Descanso (s)</Label>
              <Input inputMode="numeric" value={card.restSeconds} onChange={(e) => onChange({ restSeconds: sanitizeIntInput(e.target.value) })} className="h-9" />
            </div>
          </div>
        </div>
      }
    />
  );
}

function EditExerciseButton({
  studentId, block, item, exerciseLibrary, onChange,
}: {
  studentId: string;
  block: Block;
  item: BlockItem;
  exerciseLibrary: ExerciseLib[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      title="Editar exercício"
      description={`${SERIES_TYPE_LABEL[block.seriesType]} · ${block.rounds}x`}
      trigger={
        <button
          type="button"
          aria-label={`Editar ${item.exerciseName}`}
          className="tf-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--primary)]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <EditExerciseForm
          studentId={studentId}
          block={block}
          item={item}
          exerciseLibrary={exerciseLibrary}
          onSuccess={() => { setOpen(false); onChange(); }}
        />
      )}
    </Dialog>
  );
}

function EditExerciseForm({
  studentId, block, item, exerciseLibrary, onSuccess,
}: {
  studentId: string;
  block: Block;
  item: BlockItem;
  exerciseLibrary: ExerciseLib[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isTimeBased = SERIES_TYPES_TIME_BASED.includes(block.seriesType);
  const [slot, setSlot] = useState<SlotState>(() => ({
    key: item.id,
    exerciseId: item.exerciseId,
    exerciseName: item.exerciseName,
    imageUrl: item.imageUrl,
    search: item.exerciseName,
    reps: item.reps ?? "",
    loadKg: item.loadKg ? String(Number(item.loadKg)).replace(".", ",") : "",
    tempo: item.tempo ?? "",
    holdSeconds: item.holdSeconds ? String(item.holdSeconds) : "",
    notes: item.notes ?? "",
  }));

  function save() {
    setError(null);
    if (!slot.exerciseId) {
      setError("Selecione um exercício.");
      return;
    }
    startTransition(async () => {
      const res = await updateBlockExercise(studentId, item.id, {
        exerciseId: slot.exerciseId,
        reps: isTimeBased ? undefined : slot.reps || undefined,
        loadKg: slot.loadKg || undefined,
        tempo: slot.tempo || undefined,
        holdSeconds: isTimeBased && slot.holdSeconds ? slot.holdSeconds : undefined,
        notes: slot.notes || undefined,
      });
      if ("error" in res) {
        setError(res.error ?? "Não foi possível salvar o exercício.");
      } else {
        toast({ variant: "success", description: "Exercício atualizado." });
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ExerciseSlotField
        index={0}
        slot={slot}
        isTimeBased={isTimeBased}
        showBaseFields
        exerciseLibrary={exerciseLibrary}
        onChange={(patch) => setSlot((prev) => ({ ...prev, ...patch }))}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={pending} className="w-full sm:w-auto">
          {pending ? "Salvando…" : "Salvar exercício"}
        </Button>
      </div>
    </div>
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

  const [seriesType, setSeriesType] = useState<SeriesType>("biset");
  const { min, max } = SERIES_TYPE_EXERCISE_COUNT[seriesType];
  const hasSetDetail = SERIES_TYPES_WITH_SET_DETAIL.includes(seriesType);
  const isTimeBased = SERIES_TYPES_TIME_BASED.includes(seriesType);
  // Série simples aceita quantos exercícios forem preciso no mesmo envio (cada um vira um bloco).
  const isSimple = seriesType === "simples";
  const maxSlots = isSimple ? Infinity : max;
  const canAddRemoveSlots = isSimple || max > min;

  const [rounds, setRounds] = useState("3");
  const [restSeconds, setRestSeconds] = useState("60");
  const [blockNotes, setBlockNotes] = useState("");

  const [slots, setSlots] = useState<SlotState[]>([emptySlot()]);
  const [setsRows, setSetsRows] = useState<{ setNumber: number; label: string; reps: string; loadKg: string; holdSeconds: string }[]>([
    { setNumber: 1, label: "", reps: "", loadKg: "", holdSeconds: "" },
  ]);

  function changeSeriesType(next: SeriesType) {
    setSeriesType(next);
    const { min: nextMin } = SERIES_TYPE_EXERCISE_COUNT[next];
    const nextMax = next === "simples" ? Infinity : SERIES_TYPE_EXERCISE_COUNT[next].max;
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
    setSlots((prev) => (prev.length < maxSlots ? [...prev, emptySlot()] : prev));
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

    // Números seguem como texto; a action valida e converte para número antes de gravar.
    const setsDetail = hasSetDetail
      ? setsRows.map((row) => ({
        setNumber: row.setNumber,
        label: row.label || undefined,
        reps: isTimeBased ? undefined : row.reps || undefined,
        loadKg: row.loadKg || undefined,
        holdSeconds: row.holdSeconds || undefined,
      }))
      : undefined;

    const payload: CreateBlockInput = {
      seriesType,
      rounds: hasSetDetail ? String(setsRows.length) : rounds,
      restSeconds: restSeconds || undefined,
      notes: !isSimple && blockNotes ? blockNotes : undefined,
      exercises: slots.map((s, i) => ({
        exerciseId: s.exerciseId,
        reps: isTimeBased ? undefined : s.reps || undefined,
        loadKg: s.loadKg || undefined,
        tempo: s.tempo || undefined,
        holdSeconds: isTimeBased && s.holdSeconds ? s.holdSeconds : undefined,
        notes: s.notes || undefined,
        setsDetail: i === 0 ? setsDetail : undefined,
      })),
    };

    const count = slots.length;
    startTransition(async () => {
      const res = await createBlockWithExercises(studentId, planId, payload);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({
          variant: "success",
          description: isSimple
            ? count > 1 ? `${count} exercícios adicionados.` : "Exercício adicionado."
            : "Bloco adicionado.",
        });
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
          {COMBINED_SERIES_OPTIONS.map((o) => (
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
            <Input id="rounds" inputMode="numeric" value={rounds} onChange={(e) => setRounds(sanitizeIntInput(e.target.value))} required />
          </div>
          <div>
            <Label htmlFor="restSeconds">Descanso (s)</Label>
            <Input id="restSeconds" inputMode="numeric" value={restSeconds} onChange={(e) => setRestSeconds(sanitizeIntInput(e.target.value))} />
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
              <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] p-2">
                <span className="w-5 shrink-0 text-center text-xs text-[var(--muted)]">{row.setNumber}</span>
                <Input
                  placeholder="Rótulo (opcional)"
                  value={row.label}
                  onChange={(e) => updateSetRow(i, { label: e.target.value })}
                  className="h-9 min-w-[7rem] flex-1 text-xs"
                />
                {isTimeBased ? (
                  <Input
                    placeholder="segundos"
                    inputMode="numeric"
                    value={row.holdSeconds}
                    onChange={(e) => updateSetRow(i, { holdSeconds: sanitizeIntInput(e.target.value) })}
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
                  inputMode="decimal"
                  value={row.loadKg}
                  onChange={(e) => updateSetRow(i, { loadKg: sanitizeDecimalInput(e.target.value) })}
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
              <Input id="restSeconds2" inputMode="numeric" value={restSeconds} onChange={(e) => setRestSeconds(sanitizeIntInput(e.target.value))} />
            </div>
          </div>
        </div>
      )}

      {!isSimple && (
        <div>
          <Label htmlFor="blockNotes">Observações do bloco (opcional)</Label>
          <Input id="blockNotes" value={blockNotes} onChange={(e) => setBlockNotes(e.target.value)} placeholder="Ex: priorizar amplitude total" />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>{isSimple ? `Exercícios (${slots.length})` : max > 1 ? `Exercícios (${slots.length}${max !== min ? `/${max}` : ""})` : "Exercício"}</Label>
          {canAddRemoveSlots && slots.length < maxSlots && (
            <Button type="button" size="sm" variant="secondary" onClick={addSlot}>
              <Plus className="h-3.5 w-3.5" /> {isSimple ? "Outro exercício" : "Exercício"}
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
        <Button type="button" onClick={submit} disabled={pending} className="w-full sm:w-auto">
          {pending ? "Adicionando…" : isSimple ? (slots.length > 1 ? `Adicionar ${slots.length} exercícios` : "Adicionar exercício") : "Adicionar bloco"}
        </Button>
      </div>
    </div>
  );
}

function ExerciseSlotField({
  index, slot, exerciseLibrary, onChange, onRemove, isTimeBased, showBaseFields, extra,
}: {
  index: number;
  slot: SlotState;
  exerciseLibrary: ExerciseLib[];
  onChange: (patch: Partial<SlotState>) => void;
  onRemove?: () => void;
  isTimeBased: boolean;
  showBaseFields: boolean;
  extra?: ReactNode;
}) {
  const options: AutocompleteOption[] = useMemo(() => {
    const q = slot.search.trim().toLowerCase();
    if (!q) return [];
    return exerciseLibrary
      .filter((ex) => ex.name.toLowerCase().includes(q))
      .slice(0, 30)
      .map((ex) => ({
        id: ex.id,
        label: toDisplayText(ex.name),
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

      {extra}
      {slot.exerciseId ? (
        <div className="mb-2 flex items-center gap-2 rounded-[var(--radius)] bg-[var(--background)] p-2">
          <ExerciseThumb item={{ imageUrl: slot.imageUrl, name: slot.exerciseName }} />
          <p className="truncate text-sm">{toDisplayText(slot.exerciseName)}</p>
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
              <Input inputMode="numeric" value={slot.holdSeconds} onChange={(e) => onChange({ holdSeconds: sanitizeIntInput(e.target.value) })} className="h-9" />
            </div>
          ) : (
            <div>
              <Label className="text-xs">Repetições</Label>
              <Input placeholder="8-12" value={slot.reps} onChange={(e) => onChange({ reps: e.target.value })} className="h-9" />
            </div>
          )}
          <div>
            <Label className="text-xs">Carga (kg)</Label>
            <NumberInput value={slot.loadKg} onValueChange={(v) => onChange({ loadKg: v })} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Tempo</Label>
            <Input placeholder="2-0-2" value={slot.tempo} onChange={(e) => onChange({ tempo: e.target.value })} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Observação</Label>
            <Input placeholder="Ex: cada perna" value={slot.notes} onChange={(e) => onChange({ notes: e.target.value })} className="h-9" />
          </div>
        </div>
      )}
    </div>
  );
}
