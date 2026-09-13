"use client";

import * as React from "react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { USER_ROLE_LABEL } from "@/lib/constants";
import { EditUserButton } from "./edit-user-button";
import { DeleteUserButton } from "./delete-user-button";
import { ResetPasswordButton } from "./reset-password-button";

type TrainerOption = { id: string; name: string; email: string };

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "trainer" | "student";
  trainerId: string | null;
  mustChangePassword: boolean;
  createdAt: Date;
};

const roleBadgeVariant: Record<UserRow["role"], "default" | "secondary" | "outline"> = {
  admin: "default",
  trainer: "secondary",
  student: "outline",
};

export function UsersTable({ rows, trainerOptions }: { rows: UserRow[]; trainerOptions: TrainerOption[] }) {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    if (!normalizedQuery) return rows;
    return rows.filter(
      (u) => u.name.toLowerCase().includes(normalizedQuery) || u.email.toLowerCase().includes(normalizedQuery)
    );
  }, [rows, normalizedQuery]);

  const trainerNameById = React.useMemo(
    () => Object.fromEntries(trainerOptions.map((t) => [t.id, t.name])),
    [trainerOptions]
  );

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
        />
      </div>

      {filtered.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            {rows.length === 0 ? "Nenhum usuário cadastrado ainda." : `Nenhum usuário encontrado para "${query}".`}
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <Panel key={u.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{u.name}</p>
                  <Badge variant={roleBadgeVariant[u.role]}>{USER_ROLE_LABEL[u.role]}</Badge>
                  {u.mustChangePassword && <Badge variant="warning">Senha provisória</Badge>}
                </div>
                <p className="truncate text-xs text-[var(--muted)]">{u.email}</p>
                {u.role === "student" && u.trainerId && (
                  <p className="truncate text-xs text-[var(--muted)]">
                    Personal: {trainerNameById[u.trainerId] ?? "—"}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ResetPasswordButton userId={u.id} name={u.name} />
                <EditUserButton user={u} trainerOptions={trainerOptions} />
                <DeleteUserButton id={u.id} name={u.name} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
