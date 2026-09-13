"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LineChart, CalendarDays, MessageSquare, Salad, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/portal", label: "Hoje", icon: Home },
  { href: "/portal/progress", label: "Evolução", icon: LineChart },
  { href: "/portal/nutrition", label: "Nutrição", icon: Salad },
  { href: "/portal/finance", label: "Financeiro", icon: Wallet },
  { href: "/portal/schedule", label: "Agenda", icon: CalendarDays },
  { href: "/portal/chat", label: "Chat", icon: MessageSquare },
];

export function PortalBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="tf-hairline fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-stretch justify-around bg-[var(--surface)]/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {nav.map((item) => {
        // "/portal" só fica ativo em match exato, senão fica sempre ativo por prefixo
        const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "tf-tap flex min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-[var(--primary)]" : "text-[var(--muted)]"
            )}
          >
            <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
