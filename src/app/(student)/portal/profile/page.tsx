import { getMyProfile } from "@/lib/actions/profile";
import { AvatarForm } from "@/components/layout/avatar-form";
import { StudentInfoForm } from "./student-info-form";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = { active: "Ativo", inactive: "Inativo", locked: "Trancado" };
const STATUS_VARIANT: Record<string, "success" | "outline" | "danger"> = {
  active: "success", inactive: "outline", locked: "danger",
};

export default async function StudentProfilePage() {
  const { user, student } = await getMyProfile();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl">Meu perfil</h1>

      <Panel>
        <PanelHeader>
          <PanelTitle className="text-base">Sua foto</PanelTitle>
        </PanelHeader>
        <AvatarForm
          currentAvatarUrl={user.image}
          name={user.name}
          currentZoomPct={user.avatarZoomPct}
          currentPositionX={user.avatarPositionX}
          currentPositionY={user.avatarPositionY}
        />
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle className="text-base">Seus dados</PanelTitle>
        </PanelHeader>
        {student && <StudentInfoForm student={student} />}
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle className="text-base">Conta</PanelTitle>
        </PanelHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-[var(--muted)]">Nome</dt>
            <dd className="mt-0.5">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--muted)]">E-mail</dt>
            <dd className="mt-0.5">{user.email}</dd>
          </div>
          {student && (
            <div>
              <dt className="text-xs text-[var(--muted)]">Status</dt>
              <dd className="mt-1">
                <Badge variant={STATUS_VARIANT[student.status] ?? "outline"}>
                  {STATUS_LABEL[student.status] ?? student.status}
                </Badge>
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Nome, e-mail e status são gerenciados pelo seu personal. Fale com ele se precisar corrigir algo aqui.
        </p>
      </Panel>
    </div>
  );
}
