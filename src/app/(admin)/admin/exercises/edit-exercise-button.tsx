"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ExerciseForm } from "./exercise-form";
import { Pencil } from "lucide-react";

type TrainerOption = { id: string; name: string; email: string };
type ExerciseRow = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string | null;
  videoUrl: string | null;
  imageUrl?: string | null;
  trainerId: string;
};

export function EditExerciseButton({ exercise, trainerOptions }: { exercise: ExerciseRow; trainerOptions: TrainerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="lg"
      title="Editar exercício"
      trigger={
        <button className="text-[var(--muted)] transition-colors hover:text-[var(--primary)]" title="Editar" type="button">
          <Pencil className="h-4 w-4" />
        </button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <ExerciseForm
          exercise={exercise}
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