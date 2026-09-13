"use client";

import { useRouter } from "next/navigation";
import { deleteUser } from "@/lib/actions/admin";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteUserButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <ConfirmDeleteButton
      itemLabel={name}
      trigger={
        <Button variant="ghost" size="icon" title="Excluir">
          <Trash2 className="h-4 w-4" />
        </Button>
      }
      onConfirm={async () => {
        const result = await deleteUser(id);
        if (result?.error) {
          toast({ variant: "error", description: result.error });
          throw new Error(result.error);
        }
        router.refresh();
      }}
    />
  );
}
