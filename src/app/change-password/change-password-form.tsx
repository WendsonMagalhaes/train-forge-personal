"use client";

import { useActionState, useEffect } from "react";
import { setNewPassword } from "@/lib/actions/account";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<{ error?: string } | undefined, FormData>(
    async (_prev, formData) => (await setNewPassword(formData)) ?? {},
    undefined
  );

  useEffect(() => {
    if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.error]);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-4">
      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" minLength={6} required autoFocus />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" minLength={6} required />
      </div>
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Salvando…" : "Salvar e entrar novamente"}
      </Button>
    </form>
  );
}
