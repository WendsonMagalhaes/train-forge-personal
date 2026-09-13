"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NewUserForm } from "./new-user-form";
import { Plus } from "lucide-react";

type TrainerOption = { id: string; name: string; email: string };

export function NewUserButton({ trainerOptions }: { trainerOptions: TrainerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="lg"
      title="Novo usuário"
      description="Crie uma conta de admin, personal ou aluno."
      trigger={
        <Button>
          <Plus className="h-4 w-4" /> Novo usuário
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <NewUserForm
          trainerOptions={trainerOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </Dialog>
  );
}
