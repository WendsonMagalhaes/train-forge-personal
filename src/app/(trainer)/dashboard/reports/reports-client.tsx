"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type {
  ReportPeriod,
  getRevenueByPeriod,
  getWorkoutAdherence,
  getRetentionChurn,
  getPhysicalEvolutionSummary,
} from "@/lib/actions/reports";

type Props = {
  period: ReportPeriod;
  revenue: Awaited<ReturnType<typeof getRevenueByPeriod>>;
  adherence: Awaited<ReturnType<typeof getWorkoutAdherence>>;
  retention: Awaited<ReturnType<typeof getRetentionChurn>>;
  evolution: Awaited<ReturnType<typeof getPhysicalEvolutionSummary>>;
};

export function ReportsClient({ period, revenue, adherence, retention, evolution }: Props) {
  const router = useRouter();

  function handleFilter(formData: FormData) {
    const from = String(formData.get("from"));
    const to = String(formData.get("to"));
    router.push(`/dashboard/reports?from=${from}&to=${to}`);
  }

  return (
    <div className="space-y-6">
      <Panel>
        <form action={handleFilter} className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="from">De</Label>
            <Input id="from" name="from" type="date" defaultValue={period.from} />
          </div>
          <div>
            <Label htmlFor="to">Até</Label>
            <Input id="to" name="to" type="date" defaultValue={period.to} />
          </div>
          <Button type="submit">Filtrar</Button>
        </form>
      </Panel>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita no período"
          value={formatCents(revenue.totalCents)}
        />
        <StatCard
          label="Adesão geral aos treinos"
          value={`${adherence.overallPct}%`}
        />
        <StatCard
          label="Novos alunos"
          value={String(retention.newStudents)}
        />
        <StatCard
          label="Churn no período"
          value={`${retention.churnRatePct}%`}
        />
      </div>

      <Panel>
        <h2 className="text-lg font-semibold mb-4">Receita por dia</h2>
        {revenue.byDay.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum pagamento confirmado nesse período.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenue.byDay}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCents(Number(value))} />
              <Bar dataKey="totalCents" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold mb-4">Adesão por aluno</h2>
        {adherence.perStudent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno ativo com ficha de treino configurada nesse período.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {adherence.perStudent.map((s) => (
              <li key={s.studentId} className="py-2 flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-muted-foreground">
                  {s.performed}/{s.expected} treinos — {s.adherencePct}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold mb-4">Evolução física consolidada</h2>
        {evolution.studentsWithData === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aluno com pelo menos duas avaliações nesse período.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-sm">
            <StatCard
              label="Peso (média)"
              value={`${evolution.avgWeightDeltaKg > 0 ? "+" : ""}${evolution.avgWeightDeltaKg} kg`}
            />
            <StatCard
              label="% Gordura (média)"
              value={`${evolution.avgBodyFatDeltaPct > 0 ? "+" : ""}${evolution.avgBodyFatDeltaPct} pp`}
            />
            <StatCard
              label="Massa muscular (média)"
              value={`${evolution.avgMuscleMassDeltaKg > 0 ? "+" : ""}${evolution.avgMuscleMassDeltaKg} kg`}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Baseado em {evolution.studentsWithData} aluno(s) com 2+ avaliações no período selecionado.
        </p>
      </Panel>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
