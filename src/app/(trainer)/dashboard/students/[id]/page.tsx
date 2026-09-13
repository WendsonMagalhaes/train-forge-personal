import { getStudent } from "@/lib/actions/students";
import { notFound } from "next/navigation";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { STUDENT_GOAL_OPTIONS } from "@/lib/constants";
import { NotesSection } from "./notes-section";
import { StatusControl } from "./status-control";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Panel className="md:col-span-1">
        <PanelHeader>
          <PanelTitle>Dados</PanelTitle>
        </PanelHeader>
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted)]">Telefone</dt>
            <dd>{student.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Nascimento</dt>
            <dd>{student.birthDate || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Gênero</dt>
            <dd>{student.gender || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Objetivos</dt>
            <dd>
              {student.goals && student.goals.length > 0
                ? student.goals
                    .map((g) => STUDENT_GOAL_OPTIONS.find((o) => o.value === g)?.label ?? g)
                    .join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">Início</dt>
            <dd>{student.startedAt || "—"}</dd>
          </div>
        </dl>

        <div className="tf-hairline mt-5 pt-5">
          <StatusControl studentId={student.id} currentStatus={student.status} />
        </div>
      </Panel>

      <div className="md:col-span-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>Histórico de observações</PanelTitle>
          </PanelHeader>
          <NotesSection studentId={student.id} notes={student.notes} />
        </Panel>
      </div>
    </div>
  );
}
