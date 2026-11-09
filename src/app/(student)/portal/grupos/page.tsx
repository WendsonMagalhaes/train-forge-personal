import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { listMyChallengeGroups } from "@/lib/actions/challenge-groups";
import { Panel } from "@/components/ui/panel";

export default async function PortalGruposPage() {
  const groups = await listMyChallengeGroups();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl">Grupos</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Desafios com a turma, check-in na academia e ranking.</p>
      </div>

      {groups.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            Você ainda não participa de nenhum grupo. Quando seu personal te adicionar, ele aparece aqui.
          </p>
        </Panel>
      ) : (
        groups.map((g) => (
          <Link key={g.id} href={`/portal/grupos/${g.id}`} className="tf-tap block">
            <Panel className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display break-words text-lg">{g.name}</p>
                {g.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{g.description}</p>}
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <Trophy className="h-3.5 w-3.5" />
                  {g.myPosition > 0 ? `${g.myPosition}º de ${g.memberCount}` : `${g.memberCount} alunos`} · {g.myPoints} pts
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[var(--muted)]" />
            </Panel>
          </Link>
        ))
      )}
    </div>
  );
}
