import { getMyAssessments } from "@/lib/actions/student-assessments";
import { StudentProgressClient } from "./progress-client";

export default async function StudentProgressPage() {
    const assessments = await getMyAssessments();
    return <StudentProgressClient assessments={assessments} />;
}