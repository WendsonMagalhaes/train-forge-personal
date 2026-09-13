import { getAdminOverview } from "@/lib/actions/admin";
import { Panel } from "@/components/ui/panel";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  const cards = [
    { label: "Usuários no total", value: overview.totalUsers },
    { label: "Admins", value: overview.totalAdmins },
    { label: "Personais", value: overview.totalTrainers },
    { label: "Alunos", value: overview.totalStudents },
    { label: "Cobranças pendentes/atrasadas", value: overview.pendingPayments },
    { label: "Sessões futuras", value: overview.upcomingSessions },
    { label: "Ciclos de treino ativos", value: overview.activeCycles },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Visão Geral</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Panel key={c.label}>
            <p className="text-xs text-[var(--muted)]">{c.label}</p>
            <p className="mt-1 font-display text-3xl">{c.value}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}