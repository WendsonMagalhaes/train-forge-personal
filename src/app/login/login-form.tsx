"use client";

import { useActionState, useEffect, useState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm({ callbackUrl, defaultEmail }: { callbackUrl?: string; defaultEmail?: string }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
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
          <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={defaultEmail ?? ""} />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="tf-tap absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={pending} className="mt-2">
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </Panel>
  );
}
