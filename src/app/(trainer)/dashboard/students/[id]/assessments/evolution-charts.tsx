"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Assessment = {
  assessedAt: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  waistCm: string | null;
};

export function EvolutionCharts({ assessments }: { assessments: Assessment[] }) {
  const data = assessments.map((a) => ({
    date: new Date(a.assessedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    peso: a.weightKg ? Number(a.weightKg) : null,
    gordura: a.bodyFatPct ? Number(a.bodyFatPct) : null,
    cintura: a.waistCm ? Number(a.waistCm) : null,
  }));

  if (data.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Registre pelo menos duas avaliações para ver os gráficos de evolução.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <ChartBlock title="Peso (kg)" dataKey="peso" data={data} color="var(--tf-ember)" />
      <ChartBlock title="% Gordura" dataKey="gordura" data={data} color="var(--tf-brass)" />
    </div>
  );
}

function ChartBlock({
  title, dataKey, data, color,
}: { title: string; dataKey: string; data: Record<string, unknown>[]; color: string }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 12 }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
