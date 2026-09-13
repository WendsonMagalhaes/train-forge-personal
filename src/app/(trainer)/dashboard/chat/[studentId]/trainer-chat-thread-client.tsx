"use client";

import { ChatThread } from "@/components/layout/chat-thread";
import { listMessagesWithStudent, sendMessageToStudent, markThreadReadByTrainer } from "@/lib/actions/communication";

export function TrainerChatThreadClient({ studentId, currentUserId }: { studentId: string; currentUserId: string }) {
  return (
    <ChatThread
      currentUserId={currentUserId}
      fetchMessages={() => listMessagesWithStudent(studentId)}
      sendMessage={(content) => sendMessageToStudent(studentId, content)}
      markRead={() => markThreadReadByTrainer(studentId)}
      emptyLabel="Nenhuma mensagem ainda — envie a primeira para o aluno."
    />
  );
}
