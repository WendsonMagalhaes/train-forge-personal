"use client";

import { useActionState, useEffect, useRef } from "react";
import { addStudentNote } from "@/lib/actions/students";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type Note = { id: string; content: string; createdAt: Date };

export function NotesSection({ studentId, notes }: { studentId: string; notes: Note[] }) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | undefined, formData: FormData) => {
      return (await addStudentNote(studentId, formData)) ?? {};
    },
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Observação adicionada." });
      formRef.current?.reset();
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={formAction} className="flex gap-2">
        <textarea
          name="content"
          rows={2}
          placeholder="Adicionar observação sobre o aluno…"
          className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        />
        <Button type="submit" disabled={pending} size="sm" className="self-end">
          Adicionar
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        {notes.length === 0 && <p className="text-sm text-[var(--muted)]">Nenhuma observação registrada.</p>}
        {notes.map((n) => (
          <div key={n.id} className="tf-hairline pb-3 text-sm last:border-0">
            <p>{n.content}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {new Date(n.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
