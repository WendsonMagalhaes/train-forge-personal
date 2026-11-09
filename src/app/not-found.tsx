import Link from "next/link";
import { WifiOff, Home } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveBranding } from "@/lib/theme/resolve-brand-color";
import { StatusScreen } from "@/components/layout/status-screen";

function homeFor(role: string | undefined) {
  if (role === "trainer") return "/dashboard";
  if (role === "student") return "/portal";
  if (role === "admin") return "/admin";
  return "/";
}

export default async function NotFound() {
  const session = await auth();
  // Visitante sem login cai na marca padrão; logado vê a marca do próprio personal (ou a dele, se for aluno).
  const branding = await resolveBranding(session);

  return (
    <StatusScreen
      branding={branding}
      icon={WifiOff}
      code="404"
      title="Página não encontrada"
      description="O link pode estar quebrado ou a página pode ter sido movida."
    >
      <Link
        href={homeFor(session?.user?.role)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--tf-ember-dim)]"
      >
        <Home className="h-4 w-4" /> Voltar para o início
      </Link>
    </StatusScreen>
  );
}
