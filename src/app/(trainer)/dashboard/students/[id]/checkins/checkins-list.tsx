import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck } from "lucide-react";

type Checkin = {
  id: string;
  performedAt: Date;
  durationMinutes: number | null;
  overallFeeling: string | null;
  notes: string | null;
  planLabel: string | null;
};

const FEELING_LABEL: Record<string, { text: string; variant: "success" | "outline" | "danger" }> = {
  leve: { text: "Leve", variant: "success" },
  moderado: { text: "Moderado", variant: "outline" },
  intenso: { text: "Intenso", variant: "outline" },
  exausto: { text: "Exausto", variant: "danger" },
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export function CheckinsList({ checkins }: { checkins: Checkin[] }) {
  return (
    <Panel className="p-0">
      <div className="tf-hairline p-5 pb-4">
        <PanelHeader className="mb-0 p-0">
          <PanelTitle>Check-ins</PanelTitle>
        </PanelHeader>
        <p className="mt-1 text-sm text-[var(--muted)]">Cada treino que o aluno registra conta como um check-in.</p>
      </div>

      {checkins.length === 0 ? (
        <p className="p-5 text-sm text-[var(--muted)]">Nenhum check-in registrado ainda.</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {checkins.map((c) => {
            const feeling = c.overallFeeling ? FEELING_LABEL[c.overallFeeling] : null;
            return (
              <div key={c.id} className="flex items-start gap-3 p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                  <CalendarCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium capitalize">{formatDate(c.performedAt)}</p>
                    {feeling && <Badge variant={feeling.variant}>{feeling.text}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {c.planLabel ?? "Treino avulso"}
                    {c.durationMinutes && <> · {c.durationMinutes} min</>}
                  </p>
                  {c.notes && <p className="mt-1 text-xs text-[var(--muted)]">{c.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
