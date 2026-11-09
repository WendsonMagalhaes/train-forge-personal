"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Trophy } from "lucide-react";
import {
  createChallengeActivity, deleteChallengeActivity, addChallengeGroupMember, removeChallengeGroupMember,
  type getTrainerGroupDetail,
} from "@/lib/actions/challenge-groups";
import { GroupChat } from "@/components/challenges/group-chat";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Detail = Awaited<ReturnType<typeof getTrainerGroupDetail>>;
type Tab = "atividades" | "ranking" | "membros" | "chat";

const TABS: { value: Tab; label: string }[] = [
  { value: "atividades", label: "Atividades" },
  { value: "ranking", label: "Ranking" },
  { value: "membros", label: "Alunos" },
  { value: "chat", label: "Chat" },
];

export function GroupDetailClient({
  groupId, detail, currentUserId,
}: { groupId: string; detail: Detail; currentUserId: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [tab, setTab] = useState<Tab>("atividades");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/grupos" className="flex w-fit items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> Grupos
        </Link>
        <h1 className="font-display text-3xl break-words">{detail.group.name}</h1>
        {detail.group.description && <p className="text-sm text-[var(--muted)]">{detail.group.description}</p>}
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors",
              tab === t.value
                ? "border-[var(--primary)] font-medium text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "atividades" && <ActivitiesTab groupId={groupId} detail={detail} onChange={refresh} />}
      {tab === "ranking" && <RankingTab detail={detail} />}
      {tab === "membros" && <MembersTab groupId={groupId} detail={detail} onChange={refresh} />}
      {tab === "chat" && (
        <Panel>
          <GroupChat groupId={groupId} currentUserId={currentUserId} />
        </Panel>
      )}
    </div>
  );
}

// ---------- Atividades ----------

function ActivitiesTab({ groupId, detail, onChange }: { groupId: string; detail: Detail; onChange: () => void }) {
  const memberCount = detail.members.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {detail.activities.length === 0 ? "Nenhuma atividade ainda." : `${detail.activities.length} atividade(s)`}
        </p>
        <NewActivityButton groupId={groupId} onDone={onChange} />
      </div>

      {detail.activities.map((a) => (
        <Panel key={a.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium break-words">{a.title}</p>
              {a.description && <p className="mt-0.5 text-xs text-[var(--muted)]">{a.description}</p>}
            </div>
            <ConfirmDeleteButton
              itemLabel={a.title}
              trigger={<button type="button" aria-label="Excluir atividade" className="tf-tap flex h-8 w-8 shrink-0 items-center justify-center text-[var(--muted)] hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
              onConfirm={async () => { await deleteChallengeActivity(groupId, a.id); onChange(); }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <Badge variant="secondary">{a.points} {a.points === 1 ? "ponto" : "pontos"}</Badge>
            {a.dueDate && <span>Até {formatDate(a.dueDate)}</span>}
            <span className="ml-auto">{a.completedCount} de {memberCount} concluíram</span>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function NewActivityButton({ groupId, onDone }: { groupId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      size="md"
      title="Nova atividade"
      description="Os alunos marcam como concluída. Cada conclusão soma os pontos no ranking."
      trigger={<Button size="sm"><Plus className="h-4 w-4" />Nova atividade</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => <NewActivityForm groupId={groupId} onSuccess={() => { setOpen(false); onDone(); }} />}
    </Dialog>
  );
}

function NewActivityForm({ groupId, onSuccess }: { groupId: string; onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("1");
  const [dueDate, setDueDate] = useState("");

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("points", points);
    formData.set("dueDate", dueDate);
    startTransition(async () => {
      const res = await createChallengeActivity(groupId, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({ variant: "success", description: "Atividade criada." });
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="activity-title">Atividade</Label>
        <Input id="activity-title" placeholder="Ex: Treinar pernas 3 vezes" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div>
        <Label htmlFor="activity-description">Detalhes (opcional)</Label>
        <Input id="activity-description" placeholder="Ex: Vale treino em casa também" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="activity-points">Pontos</Label>
          <Input id="activity-points" inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div>
          <Label htmlFor="activity-due">Prazo (opcional)</Label>
          <Input id="activity-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending || title.trim().length < 2} className="w-full sm:w-auto">
          {pending ? "Criando…" : "Criar atividade"}
        </Button>
      </div>
    </div>
  );
}

// ---------- Ranking ----------

function RankingTab({ detail }: { detail: Detail }) {
  if (detail.ranking.length === 0) {
    return <Panel><p className="text-sm text-[var(--muted)]">Adicione alunos ao grupo para ver o ranking.</p></Panel>;
  }
  return (
    <Panel>
      <ol className="flex flex-col divide-y divide-[var(--border)]">
        {detail.ranking.map((r, i) => (
          <li key={r.studentId} className="flex items-center gap-3 py-3">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              i === 0 ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--background)] text-[var(--muted)]")}>
              {i === 0 ? <Trophy className="h-4 w-4" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.name}</p>
              <p className="text-xs text-[var(--muted)]">{r.completions} atividade(s) · {r.checkins} check-in(s)</p>
            </div>
            <span className="font-display text-xl">{r.points}<span className="ml-1 text-xs text-[var(--muted)]">pts</span></span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// ---------- Alunos ----------

function MembersTab({ groupId, detail, onChange }: { groupId: string; detail: Detail; onChange: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  function add() {
    if (!selected) return;
    startTransition(async () => {
      const res = await addChallengeGroupMember(groupId, selected);
      if (res?.error) {
        toast({ variant: "error", description: res.error });
      } else {
        toast({ variant: "success", description: "Aluno adicionado ao grupo." });
        setSelected("");
        onChange();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Panel className="flex flex-col gap-4">
        <h2 className="font-display text-lg">Alunos no grupo</h2>

        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={detail.availableStudents.length === 0}
            aria-label="Escolher aluno"
            className="h-10 min-w-0 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)] disabled:opacity-50"
          >
            <option value="">{detail.availableStudents.length === 0 ? "Todos os alunos já estão no grupo" : "Escolha um aluno"}</option>
            {detail.availableStudents.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button type="button" onClick={add} disabled={!selected || pending}>
            <Plus className="h-4 w-4" />Adicionar
          </Button>
        </div>

        {detail.members.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhum aluno ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {detail.members.map((m) => (
              <li key={m.studentId} className="flex items-center justify-between gap-2 py-2.5">
                <span className="min-w-0 truncate text-sm">{m.name}</span>
                <ConfirmDeleteButton
                  itemLabel={m.name}
                  title="Remover do grupo"
                  trigger={<button type="button" aria-label={`Remover ${m.name}`} className="tf-tap flex h-8 w-8 shrink-0 items-center justify-center text-[var(--muted)] hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
                  onConfirm={async () => { await removeChallengeGroupMember(groupId, m.studentId); onChange(); }}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="flex flex-col gap-4">
        <h2 className="font-display text-lg">Check-ins recentes na academia</h2>
        {detail.recentCheckins.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhum check-in ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {detail.recentCheckins.map((c, i) => (
              <li key={`${c.name}-${i}`} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0 truncate">{c.name}</span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{formatDate(c.checkinDate)} · {formatTime(c.checkedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ---------- Helpers ----------

/** "2026-11-09" -> "09/11" (sem depender do fuso do navegador). */
function formatDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function formatTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}
