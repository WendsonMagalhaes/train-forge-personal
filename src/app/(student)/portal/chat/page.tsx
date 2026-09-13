import { auth } from "@/lib/auth";
import { listEducationalContent } from "@/lib/actions/communication";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { StudentChatThreadClient } from "./student-chat-thread-client";

export default async function StudentChatPage() {
  const session = await auth();
  const content = await listEducationalContent();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl">Chat com o personal</h1>
        <Panel className="mt-3 flex h-[420px] flex-col overflow-hidden">
          <StudentChatThreadClient currentUserId={session!.user.id} />
        </Panel>
      </div>

      {content.length > 0 && (
        <div>
          <h2 className="font-display text-lg">Conteúdo do seu personal</h2>
          <div className="mt-3 flex flex-col gap-3">
            {content.map((c) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
