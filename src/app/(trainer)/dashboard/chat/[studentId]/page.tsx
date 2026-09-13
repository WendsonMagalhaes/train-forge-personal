import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Panel } from "@/components/ui/panel";
import { TrainerChatThreadClient } from "./trainer-chat-thread-client";

export default async function TrainerChatThreadPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const [row] = await db
    .select({ name: users.name })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .where(and(eq(students.id, studentId), eq(students.trainerId, session.user.id)))
    .limit(1);

  if (!row) notFound();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/dashboard/chat" className="text-[var(--muted)] hover:text-[var(--primary)]" aria-label="Voltar para mensagens">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-2xl">{row.name}</h1>
      </div>
      <Panel className="flex flex-1 flex-col overflow-hidden">
        <TrainerChatThreadClient studentId={studentId} currentUserId={session.user.id} />
      </Panel>
    </div>
  );
}
