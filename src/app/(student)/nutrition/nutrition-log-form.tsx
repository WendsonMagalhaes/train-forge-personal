"use client";

import { useState, useTransition } from "react";
import { createNutritionLog } from "@/lib/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const MEAL_OPTIONS = ["Café da manhã", "Almoço", "Lanche", "Jantar", "Outro"];

export function NutritionLogForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await createNutritionLog({
          meal: String(formData.get("meal") || ""),
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
        <Label htmlFor="meal">Refeição</Label>
        <select
          id="meal"
          name="meal"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          defaultValue={MEAL_OPTIONS[0]}
        >
          {MEAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="description">O que você comeu?</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Ex: 150g de frango grelhado, arroz, salada"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-500">Refeição registrada.</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Registrar"}
      </Button>
    </form>
  );
}
