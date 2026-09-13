import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { AvatarForm } from "@/components/layout/avatar-form";
import { LogoForm } from "../settings/logo-form";

export default async function ProfilePage() {
  const session = await auth();
  const [me] = await db.select().from(users).where(eq(users.id, session!.user.id)).limit(1);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl mb-6">Perfil</h1>

      <Panel>
        <PanelHeader>
          <PanelTitle>Sua foto</PanelTitle>
        </PanelHeader>
        <p className="mb-5 text-sm text-[var(--muted)]">Aparece no seu painel e nas conversas com seus alunos.</p>
        <AvatarForm
          currentAvatarUrl={me.image}
          name={me.name}
          currentZoomPct={me.avatarZoomPct}
          currentPositionX={me.avatarPositionX}
          currentPositionY={me.avatarPositionY}
        />
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Sua logo</PanelTitle>
        </PanelHeader>
        <p className="mb-5 text-sm text-[var(--muted)]">
          Envie a logo do seu negócio pra substituir a logo padrão do Train Forge — tanto no{" "}
          <b className="text-[var(--foreground)]">seu painel</b> quanto no{" "}
          <b className="text-[var(--foreground)]">portal dos seus alunos</b>.
        </p>
        <LogoForm
          currentLogoUrl={me.logoUrl}
          currentSizePct={me.logoSizePct}
          currentPositionX={me.logoPositionX}
          currentPositionY={me.logoPositionY}
        />
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Conta</PanelTitle>
        </PanelHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted)]">Nome</dt>
            <dd className="mt-0.5">{me.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">E-mail</dt>
            <dd className="mt-0.5">{me.email}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
