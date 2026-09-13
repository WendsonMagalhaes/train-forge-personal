"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell, MessageSquare, Wallet, CalendarClock, Dumbbell, Megaphone, Info, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listMyNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/actions/communication";
import { PushSubscribeButton } from "@/components/pwa/push-subscribe-button";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean | null;
  createdAt: Date;
};

const POLL_MS = 20000;

/** Ícone + cor de destaque por tipo de notificação — ajuda a escanear a lista rapidamente. */
const TYPE_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  message: { icon: MessageSquare, className: "bg-sky-500/15 text-sky-500" },
  payment_due: { icon: Wallet, className: "bg-[var(--tf-brass)]/20 text-[var(--tf-brass)]" },
  session_reminder: { icon: CalendarClock, className: "bg-[var(--tf-ember)]/15 text-[var(--tf-ember)]" },
  workout_reminder: { icon: Dumbbell, className: "bg-emerald-500/15 text-emerald-500" },
  educational: { icon: Megaphone, className: "bg-violet-500/15 text-violet-500" },
  general: { icon: Info, className: "bg-[var(--muted)]/20 text-[var(--muted)]" },
};

function relativeTime(date: Date) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

export function NotificationBell({
  align = "right",
  side = "bottom",
}: {
  /** De que lado o painel se estende a partir do botão. "left" evita vazar pra fora em sidebars estreitas. */
  align?: "left" | "right";
  /** Se o painel abre pra baixo ou pra cima — use "top" quando o sino fica perto do rodapé da tela. */
  side?: "top" | "bottom";
}) {
  const [items, setItems] = React.useState<NotificationRow[]>([]);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const rows = await listMyNotifications();
      setItems(rows);
    } catch {
      // sessão pode ter expirado — ignora silenciosamente, o layout cuida do redirect
    }
  }, []);

  React.useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, [load]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notificações — ${unreadCount} não lida(s)` : "Notificações"}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--tf-ember)] hover:text-[var(--primary)]"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--tf-ember)] px-1 text-[9px] font-semibold text-[#17130f]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "tf-panel absolute z-30 w-80 max-w-[90vw] overflow-hidden p-0 shadow-lg",
            align === "left" ? "left-0" : "right-0",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          <div className="tf-hairline flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-medium">
              Notificações {unreadCount > 0 && <span className="text-[var(--muted)]">({unreadCount})</span>}
            </span>
            <div className="flex items-center gap-3">
              <PushSubscribeButton />
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    await markAllNotificationsRead();
                    load();
                  }}
                  className="text-xs text-[var(--muted)] hover:text-[var(--primary)]"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="h-5 w-5 text-[var(--muted)]" />
                <p className="text-sm text-[var(--muted)]">Nenhuma notificação ainda.</p>
              </div>
            ) : (
              items.map((n) => {
                const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.general;
                const Icon = config.icon;
                return (
                  <Link
                    key={n.id}
                    href={n.link ?? "#"}
                    onClick={async () => {
                      if (!n.read) await markNotificationRead(n.id);
                      setOpen(false);
                      load();
                    }}
                    className={cn(
                      "tf-hairline flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--background)]",
                      !n.read && "bg-[var(--background)]/60"
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", config.className)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("text-sm", !n.read ? "font-medium" : "font-normal text-[var(--foreground)]")}>
                          {n.title}
                        </span>
                        {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tf-ember)]" />}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--muted)]">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-[var(--muted)]">{relativeTime(n.createdAt)}</span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
