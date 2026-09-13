import { listMySessions } from "@/lib/actions/student-schedule";
import { StudentScheduleClient } from "./schedule-client";

export default async function StudentSchedulePage() {
  const sessions = await listMySessions();
  return <StudentScheduleClient sessions={sessions} />;
}
