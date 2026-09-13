"use client";

import { useTransition, type ReactNode } from "react";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { useToast } from "./toast";

export function ConfirmDeleteButton({
  itemLabel,
  onConfirm,
  trigger,
  title = "Confirmar exclusão",
  successMessage,
}: {
  itemLabel: string;
  onConfirm: () => Promise<unknown> | void;
  trigger: ReactNode;
  title?: string;
  /** Mensagem customizada do toast de sucesso. Padrão: "{itemLabel} excluído." */
  successMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Dialog title={title} trigger={trigger} size="sm">
      {(close) => (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--muted)]">
            Tem certeza que deseja excluir <b className="text-[var(--foreground)]">{itemLabel}</b>?
            Essa ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await onConfirm();
                    close();
                    toast({ variant: "success", description: successMessage ?? `${itemLabel} excluído.` });
                  } catch {
                    toast({ variant: "error", description: "Não foi possível excluir. Tente novamente." });
                  }
                });
              }}
            >
              {pending ? "Excluindo…" : "Excluir"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}