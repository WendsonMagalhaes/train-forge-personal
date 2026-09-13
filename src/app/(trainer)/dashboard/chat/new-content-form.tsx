"use client";

import { useActionState, useEffect } from "react";
import { createEducationalContent } from "@/lib/actions/communication";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function NewContentForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await createEducationalContent(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Conteúdo publicado para seus alunos." });
      onSuccess();
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required placeholder="Ex: Como calcular sua ingestão de água" />
      </div>
      <div>
        <Label htmlFor="body">Texto</Label>
        <textarea
          id="body"
          name="body"
          rows={4}
          className="flex w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus-visible:border-[var(--tf-ember)]"
          placeholder="Conteúdo do artigo, dica ou orientação..."
        />
      </div>
      <div>
        <Label htmlFor="mediaUrl">Link de material (opcional)</Label>
        <Input id="mediaUrl" name="mediaUrl" type="url" placeholder="https://..." />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Publicando..." : "Publicar para os alunos"}
      </Button>
    </form>
  );
}
