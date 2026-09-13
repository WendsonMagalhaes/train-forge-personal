import Link from "next/link";
import { listStudents } from "@/lib/actions/students";
import { Panel } from "@/components/ui/panel";
import { ChevronRight } from "lucide-react";

export default async function AssessmentsPickerPage() {
  const students = await listStudents();

  return (
    <div>
      <h1 className="font-display text-3xl mb-6">Avaliações</h1>
      <p className="mb-4 text-sm text-[var(--muted)]">Escolha um aluno para ver ou registrar uma avaliação física.</p>

      {students.length === 0 ? (
        <Panel><p className="text-sm text-[var(--muted)]">Nenhum aluno cadastrado ainda.</p></Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <Link key={s.id} href={`/dashboard/students/${s.id}/assessments`}>
              <Panel className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--muted)]">{s.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
