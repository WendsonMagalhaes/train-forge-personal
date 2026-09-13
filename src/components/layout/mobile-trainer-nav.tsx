"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, Dumbbell, LineChart, Wallet, CalendarDays, MessageSquare, BarChart3, Palette, Menu, X,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";

const nav = [
  { href: "/dashboard", label: "Visão Geral", icon: BarChart3 },
  { href: "/dashboard/students", label: "Alunos", icon: Users },
  { href: "/dashboard/exercises", label: "Exercícios", icon: Dumbbell },
  { href: "/dashboard/assessments", label: "Avaliações", icon: LineChart },
  { href: "/dashboard/schedule", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/finance", label: "Financeiro", icon: Wallet },
  { href: "/dashboard/chat", label: "Mensagens", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Personalização", icon: Palette },
];

export function MobileTrainerNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        className="text-[var(--foreground)]"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <nav className="relative z-10 flex h-full w-72 max-w-[80vw] flex-col border-r border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-8 flex items-center justify-between">
              <Logo className="h-6 w-auto" />
              <button onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm ${
                      active ? "bg-[var(--background)] text-[var(--primary)]" : "text-[var(--foreground)]"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
