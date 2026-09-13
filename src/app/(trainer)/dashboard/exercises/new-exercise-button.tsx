"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NewExerciseForm } from "./new-exercise-form";
import { Plus } from "lucide-react";

type ExerciseOption = { id: string; name: string; muscleGroup: string };

export function NewExerciseButton({ exerciseOptions = [] }: { exerciseOptions?: ExerciseOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="lg"
      title="Novo exercício"
      description="Adicione à sua biblioteca para usar nas fichas de treino."
      trigger={
        <Button>
          <Plus className="h-4 w-4" /> Novo exercício
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <NewExerciseForm
          exerciseOptions={exerciseOptions}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </Dialog>
  );
}
