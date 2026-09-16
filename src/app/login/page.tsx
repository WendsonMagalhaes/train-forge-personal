import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/layout/logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; passwordChanged?: string }>;
}) {
  const { callbackUrl, passwordChanged } = await searchParams;

  // Sessão já válida (ex.: abriu o PWA instalado, que sempre começa em /login)
  // — manda direto pra área do papel em vez de mostrar o formulário de novo.
  if (!passwordChanged) {
    const session = await auth();
    if (session?.user) {
      redirect(callbackUrl || (session.user.role === "admin" ? "/admin" : session.user.role === "student" ? "/portal" : "/dashboard"));
    }
  }

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