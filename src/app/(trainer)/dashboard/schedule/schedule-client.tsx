"use client";

import { useState, useTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSession, updateSessionStatus, deleteSession } from "@/lib/actions/schedule";
import { sendSessionReminderNow } from "@/lib/actions/reminders";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { SESSION_MODE_LABEL, SESSION_STATUS_LABEL } from "@/lib/constants";
import { Plus, Trash2, Check, X, MapPin, BellRing, BellOff } from "lucide-react";

type FormState = { error?: string; success?: boolean };

type SessionRow = {
  id: string; startsAt: Date; endsAt: Date; mode: string; location: string | null;
  status: string; confirmedByStudent: boolean | null; reminderSentAt: Date | null;
  studentId: string; studentName: string;
};
type StudentOption = { id: string; name: string };

const statusVariant: Record<string, "success" | "outline" | "danger" | "warning"> = {
  scheduled: "outline", confirmed: "success", completed: "success",
  missed: "danger", rescheduled: "warning", canceled: "outline",
};

export function ScheduleClient({ sessions, studentOptions }: { sessions: SessionRow[]; studentOptions: StudentOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const refresh = () => router.refresh();

  const groups = groupByDay(sessions);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Agenda</h1>
        <Dialog
          size="lg"
          title="Nova sessão"
          trigger={<Button><Plus className="h-4 w-4" />Nova sessão</Button>}
          open={open}
          onOpenChange={setOpen}
        >
          {() => (
            <NewSessionForm
              studentOptions={studentOptions}
              onSuccess={() => { setOpen(false); refresh(); }}
            />
          )}
        </Dialog>
      </div>

      {sessions.length === 0 ? (
        <Panel><p className="text-sm text-[var(--muted)]">Nenhuma sessão agendada. Clique em <b className="text-[var(--foreground)]">Nova sessão</b>.</p></Panel>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">{day}</p>
              <div className="flex flex-col gap-2">
                {items.map((s) => <SessionRowCard key={s.id} session={s} onChange={refresh} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(sessions: SessionRow[]) {
  const map = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    const key = new Date(s.startsAt).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries());
}

function NewSessionForm({ studentOptions, onSuccess }: { studentOptions: StudentOption[]; onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    async (_prev, formData) => (await createSession(formData)) ?? {},
    undefined
  );
  useEffect(() => {
    if (state?.success) { toast({ variant: "success", description: "Sessão agendada." }); onSuccess(); }
    else if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (studentOptions.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Cadastre um aluno ativo antes de agendar uma sessão.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="studentId">Aluno</Label>
        <select
          id="studentId" name="studentId" required defaultValue=""
          className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        >
          <option value="" disabled>Selecione…</option>
          {studentOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="date">Data</Label><Input id="date" name="date" type="date" required /></div>
        <div><Label htmlFor="startTime">Horário</Label><Input id="startTime" name="startTime" type="time" required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label htmlFor="durationMinutes">Duração (min)</Label><Input id="durationMinutes" name="durationMinutes" type="number" defaultValue={60} /></div>
        <div>
          <Label htmlFor="mode">Modalidade</Label>
          <select
            id="mode" name="mode" defaultValue="in_person"
            className="h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
          >
            <option value="in_person">Presencial</option>
            <option value="online">Online</option>
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="location">Local / link</Label>
        <Input id="location" name="location" placeholder="Academia X, ou link da chamada…" />
      </div>
      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>{pending ? "Agendando…" : "Agendar"}</Button>
      </div>
    </form>
  );
}

function SessionRowCard({ session, onChange }: { session: SessionRow; onChange: () => void }) {
  const [pending, startTransition] = useTransition();
  const [reminderPending, startReminderTransition] = useTransition();
  const { toast } = useToast();

  const isOpen = session.status !== "completed" && session.status !== "missed" && session.status !== "canceled";

  function setStatus(status: "completed" | "missed") {
    startTransition(async () => {
      await updateSessionStatus(session.id, status);
      toast({ variant: "success", description: status === "completed" ? "Sessão marcada como concluída." : "Falta registrada." });
      onChange();
    });
  }

  function sendReminder() {
    startReminderTransition(async () => {
      try {
        await sendSessionReminderNow(session.id);
        toast({ variant: "success", description: `Lembrete enviado para ${session.studentName}.` });
        onChange();
      } catch (err) {
        toast({ variant: "error", description: err instanceof Error ? err.message : "Erro ao enviar lembrete." });
      }
    });
  }

  return (
    <Panel className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{session.studentName}</p>
          <Badge variant={statusVariant[session.status] ?? "outline"}>{SESSION_STATUS_LABEL[session.status] ?? session.status}</Badge>
          {isOpen && (
            <Badge variant={session.reminderSentAt ? "success" : "outline"}>
              {session.reminderSentAt ? (
                <span className="flex items-center gap-1"><BellRing className="h-3 w-3" />Lembrete enviado</span>
              ) : (
                <span className="flex items-center gap-1"><BellOff className="h-3 w-3" />Sem lembrete</span>
              )}
            </Badge>
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
          {new Date(session.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
          {SESSION_MODE_LABEL[session.mode] ?? session.mode}
          {session.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{session.location}</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isOpen && (
          <Button size="sm" variant="secondary" disabled={reminderPending} onClick={sendReminder}>
            <BellRing className="h-3.5 w-3.5" /> {session.reminderSentAt ? "Reenviar lembrete" : "Enviar lembrete"}
          </Button>
        )}
        {session.status !== "completed" && session.status !== "missed" && (
          <>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setStatus("completed")}>
              <Check className="h-3.5 w-3.5" /> Concluída
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => setStatus("missed")}>
              <X className="h-3.5 w-3.5" /> Falta
            </Button>
          </>
        )}
        <ConfirmDeleteButton
          itemLabel={`sessão com ${session.studentName}`}
          trigger={<button className="text-[var(--muted)] hover:text-red-500" type="button"><Trash2 className="h-4 w-4" /></button>}
          onConfirm={async () => { await deleteSession(session.id); onChange(); }}
        />
      </div>
    </Panel>
  );
}
