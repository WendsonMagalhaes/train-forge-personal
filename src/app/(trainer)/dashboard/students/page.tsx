import { listStudents } from "@/lib/actions/students";
import { STUDENT_GOAL_OPTIONS } from "@/lib/constants";
import { NewStudentButton } from "./new-student-button";
import { StudentsExplorer } from "./students-explorer";

const goalLabel = Object.fromEntries(STUDENT_GOAL_OPTIONS.map((g) => [g.value, g.label]));

export default async function StudentsPage() {
  const rows = await listStudents();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Alunos</h1>
        <NewStudentButton />
      </div>

      <StudentsExplorer rows={rows} goalLabel={goalLabel} />
    </div>
  );
}
