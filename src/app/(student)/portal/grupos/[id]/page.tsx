import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getMyGroupDetail } from "@/lib/actions/challenge-groups";
import { StudentGroupClient } from "./student-group-client";

export default async function PortalGrupoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const detail = await getMyGroupDetail(id);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/portal/grupos" className="flex w-fit items-center gap-1 text-xs text-[var(--muted)]">
        <ArrowLeft className="h-3.5 w-3.5" /> Grupos
      </Link>
      <StudentGroupClient groupId={id} detail={detail} currentUserId={session!.user.id} />
    </div>
  );
}
