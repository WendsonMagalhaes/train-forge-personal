"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "./exercise-form";
import { Plus } from "lucide-react";

type TrainerOption = { id: string; name: string; email: string };

export function NewExerciseButton({ trainerOptions }: { trainerOptions: TrainerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="lg"
      title="Novo exercício"
      description="Adiciona um exercício à biblioteca de um personal específico."
      trigger={
        <Button>
          <Plus className="h-4 w-4" /> Novo exercício
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <ExerciseForm
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
