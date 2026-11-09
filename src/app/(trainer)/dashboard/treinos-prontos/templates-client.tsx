"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import {
  createWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate, deleteWorkoutTemplateBlock,
  addBlocksToWorkoutTemplate, type WorkoutTemplateItem,
} from "@/lib/actions/workout-templates";
import { AddExercisesForm, type ExerciseLib } from "../students/[id]/workouts/workouts-client";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { toDisplayText } from "@/lib/text-case";
import { SERIES_TYPE_LABEL, MUSCLE_GROUPS, MUSCLE_GROUP_LABEL, type MuscleGroup } from "@/lib/constants";
import { ChipMultiSelect } from "@/components/ui/chip-select";
import { Collapsible } from "@/components/ui/collapsible";

const MUSCLE_OPTIONS = MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_GROUP_LABEL[m] }));
const PRESET_LABELS = MUSCLE_OPTIONS.map((o) => o.label);

type TemplateBlock = WorkoutTemplateItem["blocks"][number];

const ICON_BUTTON = "tf-tap flex h-8 w-8 items-center justify-center rounded-[var(--radius)] sm:h-9 sm:w-9 text-[var(--muted)] hover:bg-[var(--background)]";

export function TemplatesClient({
  templates, exerciseLibrary,
}: { templates: WorkoutTemplateItem[]; exerciseLibrary: ExerciseLib[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">Seus treinos</h2>
        <NewTemplateButton onDone={refresh} />
      </div>

      {templates.length === 0 && (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            Nenhum treino pronto ainda. Clique em <b className="text-[var(--foreground)]">Novo treino</b>, dê um nome
            (por exemplo, Peito ou Tríceps) e depois adicione os exercícios. Também dá para salvar uma ficha de aluno
            como treino pronto, o que inclui os métodos avançados.
          </p>
        </Panel>
      )}

      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          exerciseLibrary={exerciseLibrary}
          onChange={refresh}
        />
      ))}
    </div>
  );
}

function NewTemplateButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      size="sm"
      title="Novo treino pronto"
      trigger={<Button size="sm"><Plus className="h-4 w-4" />Novo treino</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => <TemplateInfoForm onSuccess={() => { setOpen(false); onDone(); }} />}
    </Dialog>
  );
}

function TemplateInfoForm({
  template, onSuccess,
}: { template?: WorkoutTemplateItem; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Ao editar, separa o que é grupo do catálogo do que foi digitado à mão.
  const initialMuscles = template?.muscles ?? [];
  const [muscles, setMuscles] = useState<string[]>(() => initialMuscles.filter((m) => PRESET_LABELS.includes(m)).map((label) => MUSCLE_OPTIONS.find((o) => o.label === label)!.value));
  const [customMuscles, setCustomMuscles] = useState<string[]>(() => initialMuscles.filter((m) => !PRESET_LABELS.includes(m)));
  const [customInput, setCustomInput] = useState("");
  const [name, setName] = useState(template?.name ?? "");
  const [nameEdited, setNameEdited] = useState(Boolean(template));
  const [notes, setNotes] = useState(template?.notes ?? "");

  // Os grupos escolhidos viram o nome do treino (ex: "Peito/Tríceps"), como na ficha.
  // Depois que o personal edita o nome, paramos de sobrescrevê-lo.
  function buildName(presets: string[], custom: string[]) {
    return [...presets.map((m) => MUSCLE_GROUP_LABEL[m as MuscleGroup]), ...custom].join("/");
  }

  function updateMuscles(next: string[]) {
    setMuscles(next);
    if (!nameEdited) setName(buildName(next, customMuscles));
  }

  function addCustomMuscle() {
    const value = customInput.trim();
    if (!value) return;
    setCustomInput("");
    const exists = [...PRESET_LABELS, ...customMuscles].some((n) => n.toLowerCase() === value.toLowerCase());
    if (exists) return;
    const next = [...customMuscles, value];
    setCustomMuscles(next);
    if (!nameEdited) setName(buildName(muscles, next));
  }

  function removeCustomMuscle(value: string) {
    const next = customMuscles.filter((n) => n !== value);
    setCustomMuscles(next);
    if (!nameEdited) setName(buildName(muscles, next));
  }

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("notes", notes);
    for (const m of [...muscles.map((v) => MUSCLE_GROUP_LABEL[v as MuscleGroup]), ...customMuscles]) {
      formData.append("muscles", m);
    }
    startTransition(async () => {
      const res = template
        ? await updateWorkoutTemplate(template.id, formData)
        : await createWorkoutTemplate(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({ variant: "success", description: template ? "Treino pronto atualizado." : "Treino pronto criado." });
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Músculos</Label>
        <ChipMultiSelect
          ariaLabel="Músculos"
          options={MUSCLE_OPTIONS}
          value={muscles}
          onChange={updateMuscles}
        />

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
            {customMuscles.map((value) => (
              <span
                key={value}
                className="flex min-h-9 items-center gap-1 rounded-[var(--radius)] border border-[var(--primary)] bg-[var(--background)] pl-2.5 pr-1 text-sm"
              >
                {value}
                <button
                  type="button"
                  onClick={() => removeCustomMuscle(value)}
                  aria-label={`Remover ${value}`}
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
        <Label htmlFor="template-name">Nome</Label>
        <Input
          id="template-name"
          placeholder="Ex: Peito/Tríceps"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
        />
        <p className="mt-1 text-xs text-[var(--muted)]">Preenchido com os músculos escolhidos; pode ser editado.</p>
      </div>
      <div>
        <Label htmlFor="template-notes">Observações (opcional)</Label>
        <Input id="template-notes" placeholder="Ex: foco na fase excêntrica" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending || name.trim().length < 2} className="w-full sm:w-auto">
          {pending ? "Salvando…" : template ? "Salvar alterações" : "Criar treino"}
        </Button>
      </div>
    </div>
  );
}

function describeBlock(block: TemplateBlock) {
  const parts = block.exercises.map((ex) => {
    const work = ex.holdSeconds ? `${ex.holdSeconds}s` : ex.reps;
    const load = ex.loadKg ? `${Number(ex.loadKg)} kg` : null;
    const detail = [work, load].filter(Boolean).join(" · ");
    const name = toDisplayText(ex.exerciseName);
    return detail ? `${name} (${detail})` : name;
  });
  const sets = `${block.rounds} ${block.rounds === 1 ? "série" : "séries"}`;
  const rest = block.restSeconds ? ` · descanso ${block.restSeconds}s` : "";
  return `${parts.join(" + ")} — ${sets}${rest}`;
}

function TemplateCard({
  template, exerciseLibrary, onChange,
}: { template: WorkoutTemplateItem; exerciseLibrary: ExerciseLib[]; onChange: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const blockCount = template.blocks.length;

  return (
    <Panel>
      <Collapsible
        defaultOpen={false}
        title={
          <>
            <span className="font-display break-words text-lg">{toDisplayText(template.name)}</span>
            <Badge variant="outline">{blockCount === 1 ? "1 bloco" : `${blockCount} blocos`}</Badge>
          </>
        }
        actions={
          <>
            <Dialog
              size="sm"
              title="Editar treino pronto"
              trigger={<button className={ICON_BUTTON} type="button" aria-label="Editar"><Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>}
              open={editOpen}
              onOpenChange={setEditOpen}
            >
              {() => (
                <TemplateInfoForm
                  template={template}
                  onSuccess={() => { setEditOpen(false); onChange(); }}
                />
              )}
            </Dialog>
            <ConfirmDeleteButton
              itemLabel={template.name}
              trigger={<button className={`${ICON_BUTTON} hover:text-red-500`} type="button" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></button>}
              onConfirm={async () => { await deleteWorkoutTemplate(template.id); onChange(); }}
            />
          </>
        }
      >
        {template.muscles && template.muscles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {template.muscles.map((m) => <Badge key={m} variant="outline">{m}</Badge>)}
          </div>
        )}
        {template.notes && <p className="mb-4 text-xs text-[var(--muted)]">{toDisplayText(template.notes)}</p>}

        {blockCount === 0 ? (
          <p className="mb-3 text-xs text-[var(--muted)]">Nenhum exercício neste treino ainda.</p>
        ) : (
          <div className="mb-3 flex flex-col gap-2">
            {template.blocks.map((block, i) => (
              <div
                key={block.id}
                className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-3"
              >
                <span className="mt-0.5 w-4 shrink-0 text-xs text-[var(--muted)]">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{SERIES_TYPE_LABEL[block.seriesType]}</p>
                  <p className="break-words text-xs text-[var(--muted)]">{describeBlock(block)}</p>
                </div>
                <ConfirmDeleteButton
                  itemLabel={`este bloco de ${template.name}`}
                  trigger={<button className={`${ICON_BUTTON} shrink-0 hover:text-red-500`} type="button" aria-label="Remover bloco"><Trash2 className="h-3.5 w-3.5" /></button>}
                  onConfirm={async () => { await deleteWorkoutTemplateBlock(template.id, block.id); onChange(); }}
                />
              </div>
            ))}
          </div>
        )}

        {exerciseLibrary.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            Cadastre exercícios na <a href="/dashboard/exercises" className="text-[var(--primary)]">biblioteca</a> para adicioná-los aqui.
          </p>
        ) : (
          <Dialog
            size="lg"
            title={`Adicionar exercícios em ${toDisplayText(template.name)}`}
            description="Cada exercício vira um bloco do treino, com séries e descanso próprios."
            trigger={<Button size="sm" variant="secondary"><Plus className="h-3.5 w-3.5" />Adicionar exercício</Button>}
            open={addOpen}
            onOpenChange={setAddOpen}
          >
            {() => (
              <AddExercisesForm
                save={(inputs) => addBlocksToWorkoutTemplate(template.id, inputs)}
                exerciseLibrary={exerciseLibrary}
                onSuccess={() => { setAddOpen(false); onChange(); }}
              />
            )}
          </Dialog>
        )}
      </Collapsible>
    </Panel>
  );
}
