"use client";

import { useRouter } from "next/navigation";
import { deleteExerciseAdmin } from "@/lib/actions/admin";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Trash2 } from "lucide-react";

export function DeleteExerciseButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  return (
    <ConfirmDeleteButton
      itemLabel={name}
      trigger={
        <button className="text-[var(--muted)] transition-colors hover:text-red-500" title="Remover" type="button">
          <Trash2 className="h-4 w-4" />
        </button>
      }
      onConfirm={async () => {
        await deleteExerciseAdmin(id);
        router.refresh();
      }}
    />
  );
}
