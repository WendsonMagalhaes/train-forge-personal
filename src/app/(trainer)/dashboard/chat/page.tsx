import Link from "next/link";
import { auth } from "@/lib/auth";
import { listChatThreads, listEducationalContent } from "@/lib/actions/communication";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { NewContentButton } from "./new-content-button";

export default async function TrainerChatPage() {
  const session = await auth();
  const threads = await listChatThreads();
  const content = await listEducationalContent();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Mensagens</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="p-0">
          {threads.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">
              Nenhum aluno cadastrado ainda — o chat aparece aqui assim que houver alunos.
            </p>
          ) : (
            <ul>
              {threads.map((t) => (
                <li key={t.studentId} className="tf-hairline">
                  <Link
                    href={`/dashboard/chat/${t.studentId}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--background)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.studentName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {t.lastMessage ? t.lastMessage : "Sem mensagens ainda"}
                      </p>
                    </div>
                    {t.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--tf-ember)] px-1.5 text-[11px] font-semibold text-[#17130f]">
                        {t.unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">Conteúdo educativo</h2>
            <NewContentButton />
          </div>
          <div className="flex flex-col gap-3">
            {content.length === 0 ? (
              <Panel>
                <p className="text-sm text-[var(--muted)]">
                  Nada publicado ainda. Conteúdos aparecem para todos os seus alunos ativos no chat deles.
                </p>
              </Panel>
            ) : (
              content.map((c) => (
                <Panel key={c.id}>
                  <p className="font-medium">{c.title}</p>
                  {c.body && <p className="mt-1 text-sm text-[var(--muted)]">{c.body}</p>}
                  {c.mediaUrl && (
                    <a href={c.mediaUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-[var(--primary)]">
                      Ver material →
                    </a>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {new Date(c.publishedAt).toLocaleDateString("pt-BR")}
                  </Badge>
                </Panel>
              ))
            )}
          </div>
        </div>
      </div>

      {session?.user && (
        <p className="mt-4 text-xs text-[var(--muted)]">Selecione um aluno na lista para abrir a conversa.</p>
      )}
    </div>
  );
}
