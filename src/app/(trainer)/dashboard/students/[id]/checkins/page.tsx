import { listCheckins } from "@/lib/actions/student-engagement";
import { CheckinsList } from "./checkins-list";

export default async function StudentCheckinsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const checkins = await listCheckins(id);

  return <CheckinsList checkins={checkins} />;
}
