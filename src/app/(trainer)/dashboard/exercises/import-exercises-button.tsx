"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { importExercisesFromApi } from "@/lib/actions/exercises";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Download, Loader2 } from "lucide-react";

export function ImportExercisesButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const res = await importExercisesFromApi();
            toast({ variant: "success", description: `${res.imported} exercícios importados/atualizados.` });
            router.refresh();
          } catch {
            toast({ variant: "error", description: "Não foi possível importar os exercícios agora." });
          }
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {pending ? "Importando…" : "Importar da API"}
    </Button>
  );
}
