"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NewStudentForm } from "./new-student-form";
import { Plus } from "lucide-react";

export function NewStudentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Dialog
        size="lg"
        title="Novo aluno"
        description="Cadastro completo — dados de contato e objetivos."
        trigger={
          <Button className="hidden sm:inline-flex">
            <Plus className="h-4 w-4" /> Novo aluno
          </Button>
        }
        open={open}
        onOpenChange={setOpen}
      >
        {() => (
          <NewStudentForm
            onSuccess={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        )}
      </Dialog>

      {/* FAB — atalho rápido no mobile, fica acima da tab bar */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Novo aluno"
        className="tf-tap fixed bottom-24 right-4 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_6px_20px_rgba(0,0,0,0.35)] sm:hidden"
        style={{ height: "3.25rem", width: "3.25rem" }}
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}
