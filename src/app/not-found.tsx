import Link from "next/link";
import { Dumbbell, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Dumbbell className="h-10 w-10 text-[var(--primary)]" />
      <div>
        <p className="font-display text-6xl">404</p>
        <p className="mt-2 font-display text-xl">Página não encontrada</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          O link pode estar quebrado ou a página pode ter sido movida.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--tf-ember-dim)]"
      >
        <Home className="h-4 w-4" /> Voltar para o início
      </Link>
    </main>
  );
}
