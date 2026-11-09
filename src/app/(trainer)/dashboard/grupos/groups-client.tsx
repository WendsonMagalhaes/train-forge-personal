"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, ListChecks, ChevronRight } from "lucide-react";
import { createChallengeGroup, deleteChallengeGroup } from "@/lib/actions/challenge-groups";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  activityCount: number;
};

export function GroupsClient({ groups }: { groups: GroupRow[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">Seus grupos</h2>
        <NewGroupButton onDone={refresh} />
      </div>

      {groups.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            Nenhum grupo ainda. Clique em <b className="text-[var(--foreground)]">Novo grupo</b>, dê um nome
            (por exemplo, Turma da Manhã ou Desafio de Dezembro) e adicione os alunos.
          </p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewGroupButton({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      size="sm"
      title="Novo grupo de desafio"
      trigger={<Button size="sm"><Plus className="h-4 w-4" />Novo grupo</Button>}
      open={open}
      onOpenChange={setOpen}
    >
      {() => <NewGroupForm onSuccess={() => { setOpen(false); onDone(); }} />}
    </Dialog>
  );
}

function NewGroupForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    startTransition(async () => {
      const res = await createChallengeGroup(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        toast({ variant: "success", description: "Grupo criado." });
        onSuccess();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="group-name">Nome do grupo</Label>
        <Input id="group-name" placeholder="Ex: Turma da Manhã" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div>
        <Label htmlFor="group-description">Descrição (opcional)</Label>
        <Input id="group-description" placeholder="Ex: Desafio de 30 dias de treino" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending || name.trim().length < 2} className="w-full sm:w-auto">
          {pending ? "Criando…" : "Criar grupo"}
        </Button>
      </div>
    </div>
  );
}

function GroupCard({ group, onChange }: { group: GroupRow; onChange: () => void }) {
  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/dashboard/grupos/${group.id}`} className="group min-w-0 flex-1">
          <h3 className="font-display break-words text-lg group-hover:text-[var(--primary)]">{group.name}</h3>
          {group.description && <p className="mt-1 text-xs text-[var(--muted)]">{group.description}</p>}
        </Link>
        <ConfirmDeleteButton
          itemLabel={group.name}
          trigger={<button type="button" aria-label="Excluir grupo" className="tf-tap flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
          onConfirm={async () => { await deleteChallengeGroup(group.id); onChange(); }}
        />
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{group.memberCount} {group.memberCount === 1 ? "aluno" : "alunos"}</span>
        <span className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" />{group.activityCount} {group.activityCount === 1 ? "atividade" : "atividades"}</span>
      </div>

      <Link href={`/dashboard/grupos/${group.id}`} className="flex items-center justify-between text-sm text-[var(--primary)]">
        Abrir grupo <ChevronRight className="h-4 w-4" />
      </Link>
    </Panel>
  );
}
