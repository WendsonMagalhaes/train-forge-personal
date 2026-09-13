import {
  getActiveNutritionPlan,
  listNutritionPlans,
  listNutritionLogs,
} from "@/lib/actions/nutrition";
import { NutritionPlanForm } from "./nutrition-plan-form";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

export default async function StudentNutritionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;

  const [activePlan, planHistory, logs] = await Promise.all([
    getActiveNutritionPlan(studentId),
    listNutritionPlans(studentId),
    listNutritionLogs(studentId, 15),
  ]);

  return (
    <div className="space-y-6">
      <Panel>
        <h2 className="text-lg font-semibold mb-4">Novo plano nutricional</h2>
        <NutritionPlanForm studentId={studentId} />
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Plano vigente</h2>
          {activePlan && <Badge>desde {activePlan.validFrom}</Badge>}
        </div>
        {activePlan ? (
          <PlanSummary plan={activePlan} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum plano ativo no momento.
          </p>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold mb-4">Histórico de planos</h2>
        {planHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem planos anteriores.</p>
        ) : (
          <ul className="divide-y divide-border">
            {planHistory.map((plan) => (
              <li key={plan.id} className="py-3 flex items-center justify-between text-sm">
                <span>{plan.title}</span>
                <span className="text-muted-foreground">
                  {plan.validFrom} — {plan.validTo ?? "atual"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold mb-4">Diário alimentar (últimos registros)</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            O aluno ainda não registrou nenhuma refeição.
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

function PlanSummary({
  plan,
}: {
  plan: {
    title: string;
    targetCalories: string | null;
    targetProteinG: string | null;
    targetCarbsG: string | null;
    targetFatG: string | null;
    guidelines: string | null;
  };
}) {
  return (
    <div className="space-y-3">
      <p className="font-medium">{plan.title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
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
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | null;
  suffix: string;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">
        {value ? `${value} ${suffix}` : "—"}
      </p>
    </div>
  );
}
