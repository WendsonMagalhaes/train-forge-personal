import { LoginForm } from "./login-form";
import { Logo } from "@/components/layout/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; passwordChanged?: string }>;
}) {
  const { callbackUrl, passwordChanged } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="h-9 w-auto" />
          <p className="mt-3 text-sm text-[var(--muted)]">Entre com sua conta</p>
        </div>
        {passwordChanged && (
          <p className="mb-4 rounded-[var(--radius)] border border-emerald-600/40 bg-emerald-600/10 p-3 text-center text-sm text-emerald-500">
            Senha alterada com sucesso. Entre com a nova senha.
          </p>
        )}
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
