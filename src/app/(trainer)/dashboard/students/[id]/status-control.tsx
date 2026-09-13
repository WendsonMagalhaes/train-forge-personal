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

export function StatusControl({ studentId, currentStatus }: { studentId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <div>
      <p className="mb-2 text-xs text-[var(--muted)]">Status do aluno</p>
      <div className="flex gap-2">
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
