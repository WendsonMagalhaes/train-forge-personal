"use client";

import { ChatThread } from "@/components/layout/chat-thread";
import { listMyMessages, sendMessageToTrainer, markThreadReadByStudent } from "@/lib/actions/communication";

export function StudentChatThreadClient({ currentUserId }: { currentUserId: string }) {
  return (
    <ChatThread
      currentUserId={currentUserId}
      fetchMessages={listMyMessages}
      sendMessage={sendMessageToTrainer}
      markRead={markThreadReadByStudent}
      emptyLabel="Nenhuma mensagem ainda — envie a primeira para o seu personal."
    />
  );
}
