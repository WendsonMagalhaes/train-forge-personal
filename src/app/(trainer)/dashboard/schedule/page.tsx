import { listUpcomingSessions, listStudentsForPicker } from "@/lib/actions/schedule";
import { ScheduleClient } from "./schedule-client";

export default async function SchedulePage() {
  const sessions = await listUpcomingSessions();
  const studentOptions = await listStudentsForPicker();

  return <ScheduleClient sessions={sessions} studentOptions={studentOptions} />;
}
