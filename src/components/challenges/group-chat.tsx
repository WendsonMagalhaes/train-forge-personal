"use client";

import { ChatThread } from "@/components/layout/chat-thread";
import { listGroupMessages, sendGroupMessage } from "@/lib/actions/challenge-groups";

/** Chat do grupo. Usado tanto pelo personal quanto pelos alunos membros. */
export function GroupChat({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  return (
    <div className="h-[60vh] min-h-72">
      <ChatThread
        currentUserId={currentUserId}
        fetchMessages={() => listGroupMessages(groupId)}
        sendMessage={(content) => sendGroupMessage(groupId, content)}
        markRead={async () => {}}
        emptyLabel="Nenhuma mensagem ainda. Chame a galera pro treino!"
      />
    </div>
  );
}
