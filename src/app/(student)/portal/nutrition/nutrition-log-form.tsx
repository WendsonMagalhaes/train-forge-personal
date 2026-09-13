"use client";

import { useState, useTransition } from "react";
import { createNutritionLog } from "@/lib/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MEAL_OPTIONS = ["Café da manhã", "Almoço", "Lanche", "Jantar", "Outro"];

export function NutritionLogForm() {
  const [isPending, startTransition] = useTransition();
  const [meal, setMeal] = useState(MEAL_OPTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await createNutritionLog({
          meal,
          description: String(formData.get("description") || ""),
          // Upload próprio de foto ainda não existe (ver Fase 7 do roadmap) —
          // por enquanto aceita só uma URL, caso o aluno já tenha uma.
          photoUrl: (formData.get("photoUrl") as string) || "",
        });
        setSuccess(true);
        (document.getElementById("nutrition-log-form") as HTMLFormElement)?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao registrar refeição.");
      }
    });
  }

  return (
    <form id="nutrition-log-form" action={handleSubmit} className="space-y-4">
      <div>
        <Label>Refeição</Label>
        <div className="flex flex-wrap gap-2">
          {MEAL_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMeal(m)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                meal === m
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="description">O que você comeu?</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus-visible:border-[var(--tf-ember)]"
          placeholder="Ex: 150g de frango grelhado, arroz, salada"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-emerald-500">Refeição registrada.</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Registrar"}
      </Button>
    </form>
  );
}
