"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NewContentForm } from "./new-content-form";
import { Plus } from "lucide-react";

export function NewContentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="lg"
      title="Novo conteúdo"
      description="Publicado para todos os seus alunos ativos."
      trigger={
        <Button size="sm" variant="secondary">
          <Plus className="h-3.5 w-3.5" /> Publicar
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <NewContentForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </Dialog>
  );
}
