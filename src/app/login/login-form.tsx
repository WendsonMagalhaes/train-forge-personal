"use client";

import { useActionState, useEffect } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const { toast } = useToast();
  const [state, formAction, pending] = useActionState<{ error?: string } | undefined, FormData>(
    async (_prev, formData) => {
      return (await loginAction(formData)) ?? {};
    },
    undefined
  );

  useEffect(() => {
    if (state?.error) toast({ variant: "error", description: state.error });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.error]);

  return (
    <Panel>
      <form action={formAction} className="flex flex-col gap-4">
        {/* vazio = deixa o servidor decidir a página inicial pelo papel do usuário (admin/trainer/student) */}
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Panel>
  );
}
