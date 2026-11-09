"use client";

import { useState, useTransition } from "react";
import { Plus, Check } from "lucide-react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { toDisplayText } from "@/lib/text-case";
import { applyTemplatesToPlan, savePlanAsTemplate, type WorkoutTemplateItem } from "@/lib/actions/workout-templates";

// ---------- Adicionar modelos (treinos prontos) à ficha ----------

export function ApplyTemplatesButton({
  studentId, planId, templates, onDone,
}: { studentId: string; planId: string; templates: WorkoutTemplateItem[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="md"
      title="Adicionar treinos prontos à ficha"
      description="Marque um ou mais modelos. Eles entram na ficha na ordem em que foram marcados."
      trigger={<Button size="sm" variant="secondary"><Plus className="h-3.5 w-3.5" />Adicionar modelos</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <ApplyTemplatesForm
          studentId={studentId}
          planId={planId}
          templates={templates}
          onSuccess={() => { setOpen(false); onDone(); }}
        />
      )}
    </Dialog>
  );
}

function ApplyTemplatesForm({
  studentId, planId, templates, onSuccess,
}: { studentId: string; planId: string; templates: WorkoutTemplateItem[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function submit() {
    setError(null);
    const count = selected.length;
    startTransition(async () => {
      const res = await applyTemplatesToPlan(studentId, planId, selected);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({
          variant: "success",
          description: count > 1 ? `${count} treinos prontos adicionados à ficha.` : "Treino pronto adicionado à ficha.",
        });
        onSuccess();
      }
    });
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Você ainda não tem treinos prontos. Crie-os em{" "}
        <Link href="/dashboard/treinos-prontos" className="text-[var(--primary)]">Treinos prontos</Link>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {templates.map((t) => {
          const order = selected.indexOf(t.id);
          const isSelected = order !== -1;
          const exerciseNames = t.blocks
            .flatMap((b) => b.exercises.map((e) => toDisplayText(e.exerciseName)))
            .slice(0, 4);
          return (
            <label
              key={t.id}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border p-3 transition-colors ${
                isSelected ? "border-[var(--primary)] bg-[var(--background)]" : "border-[var(--border)]"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => toggle(t.id)}
              />
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-semibold ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border)] text-transparent"
                }`}
                aria-hidden="true"
              >
                {isSelected ? (order + 1) : <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{toDisplayText(t.name)}</span>
                <span className="block text-xs text-[var(--muted)]">
                  {t.blocks.length === 1 ? "1 bloco" : `${t.blocks.length} blocos`}
                  {exerciseNames.length > 0 && ` · ${exerciseNames.join(", ")}`}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={submit}
          disabled={pending || selected.length === 0}
          className="w-full sm:w-auto"
        >
          {pending
            ? "Adicionando…"
            : selected.length > 1
              ? `Adicionar ${selected.length} treinos`
              : "Adicionar à ficha"}
        </Button>
      </div>
    </div>
  );
}

// ---------- Salvar a ficha atual como modelo ----------

export function SavePlanAsTemplateButton({
  studentId, planId, onDone,
}: { studentId: string; planId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="sm"
      title="Salvar ficha como treino pronto"
      description="Cria um modelo com os exercícios desta ficha para usar em outros alunos. A ficha do aluno não muda."
      trigger={<Button size="sm" variant="secondary">Salvar como modelo</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <SavePlanAsTemplateForm
          studentId={studentId}
          planId={planId}
          onSuccess={() => { setOpen(false); onDone(); }}
        />
      )}
    </Dialog>
  );
}

function SavePlanAsTemplateForm({
  studentId, planId, onSuccess,
}: { studentId: string; planId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    startTransition(async () => {
      const res = await savePlanAsTemplate(studentId, planId, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({ variant: "success", description: "Treino pronto salvo." });
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="template-from-plan-name">Nome do treino pronto</Label>
        <Input
          id="template-from-plan-name"
          placeholder="Ex: Tríceps"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending || name.trim().length < 2} className="w-full sm:w-auto">
          {pending ? "Salvando…" : "Salvar modelo"}
        </Button>
      </div>
    </div>
  );
}
