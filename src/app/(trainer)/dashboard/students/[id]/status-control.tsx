"use client";

import { useTransition } from "react";
import { updateStudentStatus } from "@/lib/actions/students";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const options = [
  { value: "active" as const, label: "Ativo" },
  { value: "inactive" as const, label: "Inativo" },
  { value: "locked" as const, label: "Trancado" },
];

const labelByValue = Object.fromEntries(options.map((o) => [o.value, o.label]));

export function StatusControl({
  studentId,
  currentStatus,
  financeLocked,
}: {
  studentId: string;
  currentStatus: string;
  financeLocked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--muted)]">Status do aluno</p>

      {currentStatus === "locked" && financeLocked && (
        <div className="mb-3 rounded-[var(--radius)] border border-red-500/40 bg-red-500/10 p-3 text-xs">
          <p className="font-medium text-red-500">Bloqueado automaticamente por atraso na mensalidade</p>
          <p className="mt-1 text-[var(--muted)]">
            Os treinos do aluno estão indisponíveis. Ao regularizar o pagamento, o acesso volta sozinho.
            Para liberar agora, mesmo com o atraso, clique em Ativo.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Button
            key={opt.value}
            variant={currentStatus === opt.value ? "default" : "secondary"}
            size="sm"
            disabled={pending}
            className={cn(currentStatus === opt.value && "cursor-default")}
            onClick={() => {
              if (currentStatus === opt.value) return;
              startTransition(async () => {
                const res = await updateStudentStatus(studentId, opt.value);
                if (res?.error) {
                  toast({ variant: "error", description: res.error });
                } else {
                  toast({ variant: "success", description: `Status alterado para ${labelByValue[opt.value]}.` });
                }
              });
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
