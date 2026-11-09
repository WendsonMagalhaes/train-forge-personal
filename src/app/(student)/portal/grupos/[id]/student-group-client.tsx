"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Dumbbell, Flame, Trophy } from "lucide-react";
import { setMyActivityDone, gymCheckin, type getMyGroupDetail } from "@/lib/actions/challenge-groups";
import { GroupChat } from "@/components/challenges/group-chat";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Detail = Awaited<ReturnType<typeof getMyGroupDetail>>;
type Tab = "atividades" | "checkin" | "ranking" | "chat";

const TABS: { value: Tab; label: string }[] = [
  { value: "atividades", label: "Atividades" },
  { value: "checkin", label: "Check-in" },
  { value: "ranking", label: "Ranking" },
  { value: "chat", label: "Chat" },
];

export function StudentGroupClient({
  groupId, detail, currentUserId,
}: { groupId: string; detail: Detail; currentUserId: string }) {
  const [tab, setTab] = useState<Tab>("atividades");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl break-words">{detail.group.name}</h1>
        {detail.group.description && <p className="mt-1 text-sm text-[var(--muted)]">{detail.group.description}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Pontos" value={detail.myPoints} />
        <Stat label="Posição" value={detail.myPosition > 0 ? `${detail.myPosition}º` : "—"} />
        <Stat label="Check-ins" value={detail.myCheckinCount} />
      </div>

      <div role="tablist" className="grid grid-cols-4 gap-1 rounded-[var(--radius)] bg-[var(--surface)] p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "tf-tap min-h-10 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition-colors",
              tab === t.value ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "atividades" && <ActivitiesList groupId={groupId} detail={detail} />}
      {tab === "checkin" && <CheckinPanel groupId={groupId} detail={detail} />}
      {tab === "ranking" && <RankingList detail={detail} />}
      {tab === "chat" && <GroupChat groupId={groupId} currentUserId={currentUserId} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="tf-panel rounded-[var(--radius)] p-3 text-center">
      <p className="font-display text-xl">{value}</p>
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
    </div>
  );
}

// ---------- Atividades: marcar como concluída ----------

function ActivitiesList({ groupId, detail }: { groupId: string; detail: Detail }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  if (detail.activities.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--muted)]">Seu personal ainda não montou atividades neste grupo.</p>;
  }

  function toggle(activityId: string, done: boolean) {
    startTransition(async () => {
      const res = await setMyActivityDone(groupId, activityId, !done);
      if (res?.error) toast({ variant: "error", description: res.error });
      else router.refresh();
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {detail.activities.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            disabled={pending}
            aria-pressed={a.done}
            onClick={() => toggle(a.id, a.done)}
            className={cn(
              "tf-tap flex w-full items-center gap-3 rounded-[var(--radius)] border p-4 text-left transition-colors",
              a.done ? "border-emerald-600 bg-emerald-600/10" : "tf-panel border-[var(--border)]"
            )}
          >
            <span className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2",
              a.done ? "border-emerald-600 bg-emerald-600 text-white" : "border-[var(--border)] text-transparent"
            )}>
              <Check className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block font-medium break-words", a.done && "line-through opacity-70")}>{a.title}</span>
              {a.description && <span className="block text-xs text-[var(--muted)]">{a.description}</span>}
              <span className="mt-1 block text-[11px] text-[var(--muted)]">
                {a.points} {a.points === 1 ? "ponto" : "pontos"}
                {a.dueDate && ` · até ${formatDate(a.dueDate)}`}
                {` · ${a.completedCount} concluíram`}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------- Check-in de academia ----------

function CheckinPanel({ groupId, detail }: { groupId: string; detail: Detail }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function checkin() {
    startTransition(async () => {
      const res = await gymCheckin(groupId);
      if (res.alreadyDone) {
        toast({ variant: "success", description: "Você já fez check-in hoje." });
      } else {
        toast({ variant: "success", description: "Check-in feito. Bora!" });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-5 py-4 text-center">
      <button
        type="button"
        onClick={checkin}
        disabled={pending || detail.checkedInToday}
        className={cn(
          "tf-tap flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-full border-4 transition-all disabled:cursor-default",
          detail.checkedInToday
            ? "border-emerald-600 bg-emerald-600/15 text-emerald-600"
            : "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg active:scale-95"
        )}
      >
        {detail.checkedInToday ? <Check className="h-12 w-12" /> : <Dumbbell className="h-12 w-12" />}
        <span className="font-display text-lg leading-tight">
          {detail.checkedInToday ? "Check-in feito" : pending ? "Salvando…" : "Check-in"}
        </span>
      </button>

      <div>
        <p className="font-display text-xl">{detail.myCheckinCount} {detail.myCheckinCount === 1 ? "dia" : "dias"} na academia</p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {detail.checkedInToday
            ? "Volte amanhã e mantenha a sequência."
            : "Toque no botão quando chegar à academia. Vale 1 ponto por dia."}
        </p>
      </div>

      {detail.checkedInToday && <Flame className="h-5 w-5 text-[var(--primary)]" />}
    </div>
  );
}

// ---------- Ranking ----------

function RankingList({ detail }: { detail: Detail }) {
  if (detail.ranking.length === 0) return <p className="py-6 text-center text-sm text-[var(--muted)]">Sem participantes ainda.</p>;

  return (
    <ol className="tf-panel flex flex-col divide-y divide-[var(--border)] rounded-[var(--radius)] px-4">
      {detail.ranking.map((r, i) => {
        const isMe = r.studentId === detail.myStudentId;
        return (
          <li key={r.studentId} className={cn("flex items-center gap-3 py-3", isMe && "font-medium text-[var(--primary)]")}>
            <span className="w-6 shrink-0 text-center text-sm">
              {i === 0 ? <Trophy className="mx-auto h-4 w-4" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{r.name}{isMe && " (você)"}</span>
            <span className="font-display text-lg">{r.points}<span className="ml-1 text-[10px] text-[var(--muted)]">pts</span></span>
          </li>
        );
      })}
    </ol>
  );
}

function formatDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
