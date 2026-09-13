"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { StudentRowLink } from "./student-row-link";

type StudentRow = {
  id: string;
  status: "active" | "inactive" | "locked";
  goals: string[] | null;
  name: string;
  email: string;
};

const statusLabel: Record<string, { text: string; variant: "success" | "outline" | "danger" }> = {
  active: { text: "Ativo", variant: "success" },
  inactive: { text: "Inativo", variant: "outline" },
  locked: { text: "Trancado", variant: "danger" },
};

export function StudentsExplorer({
  rows,
  goalLabel,
}: {
  rows: StudentRow[];
  goalLabel: Record<string, string>;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    if (!normalizedQuery) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(normalizedQuery) ||
        s.email.toLowerCase().includes(normalizedQuery)
    );
  }, [rows, normalizedQuery]);

  const options: AutocompleteOption[] = React.useMemo(
    () => filtered.slice(0, 8).map((s) => ({ id: s.id, label: s.name, sublabel: s.email })),
    [filtered]
  );

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <Autocomplete
          value={query}
          onValueChange={setQuery}
          options={options}
          onSelect={(opt) => router.push(`/dashboard/students/${opt.id}`)}
          placeholder="Buscar aluno por nome ou e-mail..."
          emptyMessage="Nenhum aluno encontrado."
        />
      </div>

      {filtered.length === 0 ? (
        <Panel>
          <p className="text-sm text-[var(--muted)]">
            {rows.length === 0
              ? "Nenhum aluno cadastrado ainda."
              : `Nenhum aluno encontrado para "${query}".`}
          </p>
        </Panel>
      ) : (
        <>
          {/* Mobile: cards empilhados */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((s) => (
              <StudentRowLink key={s.id} id={s.id}>
                <Panel className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{s.email}</p>
                    {s.goals && s.goals.length > 0 && (
                      <p className="mt-1 truncate text-xs text-[var(--muted)]">
                        {s.goals.map((g) => goalLabel[g] ?? g).join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge variant={statusLabel[s.status].variant}>{statusLabel[s.status].text}</Badge>
                </Panel>
              </StudentRowLink>
            ))}
          </div>

          {/* Desktop / tablet: tabela */}
          <Panel className="hidden overflow-x-auto p-0 sm:block">
            <table className="w-full min-w-xl text-sm">
              <thead>
                <tr className="tf-hairline text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3 font-normal">Nome</th>
                  <th className="px-5 py-3 font-normal">E-mail</th>
                  <th className="px-5 py-3 font-normal">Objetivos</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <StudentRowLink key={s.id} id={s.id} asRow>
                    <td className="px-5 py-3">{s.name}</td>
                    <td className="px-5 py-3 text-[var(--muted)]">{s.email}</td>
                    <td className="px-5 py-3 text-[var(--muted)]">
                      {s.goals && s.goals.length > 0 ? s.goals.map((g) => goalLabel[g] ?? g).join(", ") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={statusLabel[s.status].variant}>{statusLabel[s.status].text}</Badge>
                    </td>
                  </StudentRowLink>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}
    </div>
  );
}
