import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="font-mono text-xs uppercase tracking-widest text-[var(--tf-brass)]">
        Gestão para personal trainers
      </span>
      <Logo className="h-14 w-auto sm:h-16" />
      <p className="max-w-md text-sm text-[var(--muted)]">
        Alunos, treinos, avaliações, financeiro e agenda em um único lugar —
        forjado para o dia a dia de quem treina gente.
      </p>
      <Link href="/login">
        <Button size="lg">Entrar</Button>
      </Link>
    </main>
  );
}
