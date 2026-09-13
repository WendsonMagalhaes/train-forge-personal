"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMySession } from "@/lib/actions/student-schedule";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SESSION_MODE_LABEL, SESSION_STATUS_LABEL } from "@/lib/constants";
import { MapPin } from "lucide-react";

type SessionRow = {
  id: string; startsAt: Date; endsAt: Date; mode: string; location: string | null;
  status: string; confirmedByStudent: boolean | null;
};

export function StudentScheduleClient({ sessions }: { sessions: SessionRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl">Agenda</h1>

      {sessions.length === 0 ? (
        <Panel><p className="text-sm text-[var(--muted)]">Nenhuma sessão agendada.</p></Panel>
      ) : (
        sessions.map((s) => <SessionCard key={s.id} session={s} />)
      )}
    </div>
  );
}

function SessionCard({ session }: { session: SessionRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Panel>
      <p className="text-sm font-medium">
        {new Date(session.startsAt).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        {new Date(session.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
        {SESSION_MODE_LABEL[session.mode] ?? session.mode}
        {session.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{session.location}</span>}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <Badge variant={session.confirmedByStudent ? "success" : "outline"}>
          {SESSION_STATUS_LABEL[session.status] ?? session.status}
        </Badge>
        {!session.confirmedByStudent && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await confirmMySession(session.id);
                toast({ variant: "success", description: "Presença confirmada." });
                router.refresh();
              });
            }}
          >
            {pending ? "Confirmando…" : "Confirmar presença"}
          </Button>
        )}
      </div>
    </Panel>
  );
}
