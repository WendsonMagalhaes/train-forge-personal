import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { BrandColorForm } from "./brand-color-form";
import { ImageIcon } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  const [me] = await db.select().from(users).where(eq(users.id, session!.user.id)).limit(1);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl mb-6">Personalização</h1>

      <Link href="/dashboard/profile">
        <Panel className="flex items-center gap-3 transition-colors hover:border-[var(--primary)]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
            <ImageIcon className="h-4 w-4" />
          </span>
          <span className="text-sm">
            Sua foto e a logo do seu negócio agora ficam em{" "}
            <b className="text-[var(--foreground)]">Perfil</b> →
          </span>
        </Panel>
      </Link>

      <Panel>
        <PanelHeader>
          <PanelTitle>Cor da sua marca</PanelTitle>
        </PanelHeader>
        <p className="mb-5 text-sm text-[var(--muted)]">
          Essa cor substitui o dourado padrão do Train Forge em todo o seu painel — e também no{" "}
          <b className="text-[var(--foreground)]">portal dos seus alunos</b>, para que eles vejam
          o sistema com a identidade do seu negócio.
        </p>
        <BrandColorForm currentColor={me.brandColor} logoColors={me.logoPaletteColors ?? []} />
      </Panel>
    </div>
  );
}
