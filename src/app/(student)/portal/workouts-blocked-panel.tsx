import Link from "next/link";
import { Lock, Wallet } from "lucide-react";
import { Panel } from "@/components/ui/panel";

export function WorkoutsBlockedPanel({ reason }: { reason: "locked" | "overdue" }) {
  if (reason === "locked") {
    return (
      <Panel className="space-y-3 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-500">
          <Lock className="h-5 w-5" />
        </span>
        <p className="font-medium">Seus treinos estão indisponíveis</p>
        <p className="text-sm text-[var(--muted)]">Seu acesso está trancado. Fale com seu personal.</p>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-3 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-500">
        <Lock className="h-5 w-5" />
      </span>
      <p className="font-medium">Seus treinos estão bloqueados</p>
      <p className="text-sm text-[var(--muted)]">
        Sua mensalidade está em atraso, por isso seus treinos foram bloqueados automaticamente. Assim que o pagamento for confirmado, sua ficha volta a ficar disponível sozinha.
      </p>
      <Link
        href="/portal/finance"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-black"
      >
        <Wallet className="h-4 w-4" /> Ver financeiro
      </Link>
    </Panel>
  );
}
