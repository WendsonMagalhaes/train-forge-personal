"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EditUserForm } from "./edit-user-form";
import { Pencil } from "lucide-react";

type TrainerOption = { id: string; name: string; email: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "trainer" | "student";
  trainerId: string | null;
};

export function EditUserButton({ user, trainerOptions }: { user: UserRow; trainerOptions: TrainerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      size="lg"
      title="Editar usuário"
      trigger={
        <Button variant="ghost" size="icon" title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      }
      open={open}
      onOpenChange={setOpen}
    >
      {() => (
        <EditUserForm
          user={user}
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
