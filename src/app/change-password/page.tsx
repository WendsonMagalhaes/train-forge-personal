import { auth } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="tf-panel w-full max-w-sm p-6">
        <h1 className="font-display text-2xl">Defina sua nova senha</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {session?.user?.name ? `Olá, ${session.user.name}. ` : ""}
          Por segurança, você precisa trocar a senha provisória antes de continuar.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
