import { getMyActiveNutritionPlan, listMyNutritionLogs } from "@/lib/actions/nutrition";
import { NutritionLogForm } from "./nutrition-log-form";
import { Panel } from "@/components/ui/panel";

export default async function StudentNutritionPortalPage() {
  const [plan, logs] = await Promise.all([
    getMyActiveNutritionPlan(),
    listMyNutritionLogs(10),
  ]);

  return (
    <div className="space-y-6 pb-24">
      <Panel>
        <h1 className="text-lg font-semibold mb-4">Meu plano nutricional</h1>
        {plan ? (
          <div className="space-y-3">
            <p className="font-medium">{plan.title}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Calorias" value={plan.targetCalories} suffix="kcal" />
              <Metric label="Proteína" value={plan.targetProteinG} suffix="g" />
              <Metric label="Carboidrato" value={plan.targetCarbsG} suffix="g" />
              <Metric label="Gordura" value={plan.targetFatG} suffix="g" />
            </div>
            {plan.guidelines && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {plan.guidelines}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Seu personal ainda não cadastrou um plano nutricional.
          </p>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold mb-4">Registrar refeição</h2>
        <NutritionLogForm />
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold mb-4">Meu diário</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não registrou nenhuma refeição.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((log) => (
              <li key={log.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{log.meal ?? "Refeição"}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(log.loggedAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">{log.description}</p>
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
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value ? `${value} ${suffix}` : "—"}</p>
    </div>
  );
}
