import { listAssessments } from "@/lib/actions/assessments";
import { AssessmentsClient } from "./assessments-client";

export default async function StudentAssessmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assessments = await listAssessments(id);

  return <AssessmentsClient studentId={id} assessments={assessments} />;
}
