"use client";

import { useState, useTransition } from "react";
import { createNutritionPlan } from "@/lib/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NutritionPlanForm({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        await createNutritionPlan({
          studentId,
          title: String(formData.get("title") || ""),
          targetCalories: (formData.get("targetCalories") as string) || "",
          targetProteinG: (formData.get("targetProteinG") as string) || "",
          targetCarbsG: (formData.get("targetCarbsG") as string) || "",
          targetFatG: (formData.get("targetFatG") as string) || "",
          guidelines: String(formData.get("guidelines") || ""),
          validFrom: String(formData.get("validFrom") || ""),
        });
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar plano.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Título do plano</Label>
        <Input id="title" name="title" placeholder="Ex: Fase de cutting - Jan/2027" required />
      </div>

      <div>
        <Label htmlFor="validFrom">Válido a partir de</Label>
        <Input
          id="validFrom"
          name="validFrom"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <Label htmlFor="targetCalories">Calorias (kcal)</Label>
          <Input id="targetCalories" name="targetCalories" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="targetProteinG">Proteína (g)</Label>
          <Input id="targetProteinG" name="targetProteinG" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="targetCarbsG">Carboidrato (g)</Label>
          <Input id="targetCarbsG" name="targetCarbsG" type="number" min={0} />
        </div>
        <div>
          <Label htmlFor="targetFatG">Gordura (g)</Label>
          <Input id="targetFatG" name="targetFatG" type="number" min={0} />
        </div>
      </div>

      <div>
        <Label htmlFor="guidelines">Orientações gerais</Label>
        <textarea
          id="guidelines"
          name="guidelines"
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Ex: evitar frituras, priorizar fontes magras de proteína, 2L de água por dia..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-500">Plano salvo com sucesso.</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar plano"}
      </Button>
    </form>
  );
}
