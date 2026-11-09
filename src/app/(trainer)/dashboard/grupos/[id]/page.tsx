import { auth } from "@/lib/auth";
import { getTrainerGroupDetail } from "@/lib/actions/challenge-groups";
import { GroupDetailClient } from "./group-detail-client";

export default async function GrupoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const detail = await getTrainerGroupDetail(id);

  return <GroupDetailClient groupId={id} detail={detail} currentUserId={session!.user.id} />;
}
