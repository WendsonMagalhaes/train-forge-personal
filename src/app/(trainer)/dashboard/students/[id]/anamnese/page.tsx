import { getStudent } from "@/lib/actions/students";
import { notFound } from "next/navigation";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { HealthHistoryForm } from "../health-history-form";

export default async function StudentAnamnesePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Anamnese / Avaliação inicial</PanelTitle>
      </PanelHeader>
      <HealthHistoryForm studentId={student.id} current={student.health} />
    </Panel>
  );
}
