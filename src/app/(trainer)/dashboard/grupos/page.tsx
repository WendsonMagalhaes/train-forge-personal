import { listTrainerGroups } from "@/lib/actions/challenge-groups";
import { GroupsClient } from "./groups-client";

export default async function GruposPage() {
  const groups = await listTrainerGroups();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl">Grupos de desafio</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Reúna alunos num grupo, monte atividades, acompanhe o ranking e os check-ins da academia, e converse no chat do grupo.
        </p>
      </div>
      <GroupsClient groups={groups} />
    </div>
  );
}
