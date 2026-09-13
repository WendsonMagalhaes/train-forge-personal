import { getMyActiveNutritionPlan, listMyNutritionLogs } from "@/lib/actions/nutrition";
import { NutritionLogForm } from "./nutrition-log-form";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Salad, UtensilsCrossed } from "lucide-react";

export default async function StudentNutritionPortalPage() {
  const [plan, logs] = await Promise.all([
    getMyActiveNutritionPlan(),
    listMyNutritionLogs(10),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl">Nutrição</h1>

      <Panel>
        <PanelHeader>
          <PanelTitle>Meu plano</PanelTitle>
          <Salad className="h-4 w-4 text-[var(--primary)]" />
        </PanelHeader>

        {plan ? (
          <div className="space-y-3">
            <p className="font-medium">{plan.title}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="Calorias" value={plan.targetCalories} suffix="kcal" />
              <Metric label="Proteína" value={plan.targetProteinG} suffix="g" />
              <Metric label="Carboidrato" value={plan.targetCarbsG} suffix="g" />
              <Metric label="Gordura" value={plan.targetFatG} suffix="g" />
            </div>
            {plan.guidelines && (
              <p className="whitespace-pre-line text-sm text-[var(--muted)]">{plan.guidelines}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Seu personal ainda não cadastrou um plano nutricional.
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Registrar refeição</PanelTitle>
          <UtensilsCrossed className="h-4 w-4 text-[var(--primary)]" />
        </PanelHeader>
        <NutritionLogForm />
      </Panel>

      <Panel>
        <PanelTitle className="mb-4">Meu diário</PanelTitle>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Você ainda não registrou nenhuma refeição.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {logs.map((log) => (
              <li key={log.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{log.meal ?? "Refeição"}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(log.loggedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="mt-1 text-[var(--muted)]">{log.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: string | null; suffix: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="text-base font-semibold">{value ? `${value} ${suffix}` : "—"}</p>
    </div>
  );
}
