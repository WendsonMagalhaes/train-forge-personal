"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageRow = {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
};

const POLL_MS = 8000;

export function ChatThread({
  currentUserId,
  fetchMessages,
  sendMessage,
  markRead,
  emptyLabel = "Comece a conversa enviando uma mensagem.",
}: {
  currentUserId: string;
  fetchMessages: () => Promise<MessageRow[]>;
  sendMessage: (content: string) => Promise<{ success?: boolean; error?: string }>;
  markRead: () => Promise<void>;
  emptyLabel?: string;
}) {
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    const rows = await fetchMessages();
    setMessages(rows);
  }, [fetchMessages]);

  React.useEffect(() => {
    load();
    markRead();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    const result = await sendMessage(content);
    if (result?.error) {
      setDraft(content);
    } else {
      await load();
    }
    setSending(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">{emptyLabel}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-[var(--radius)] px-3 py-2 text-sm",
                    mine ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "tf-panel"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={cn("mt-1 text-[10px] opacity-70", mine ? "text-right" : "")}>
                    {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="tf-hairline flex items-center gap-2 pt-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="h-10 flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus-visible:border-[var(--tf-ember)]"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Enviar mensagem"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-foreground)] transition-opacity disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
