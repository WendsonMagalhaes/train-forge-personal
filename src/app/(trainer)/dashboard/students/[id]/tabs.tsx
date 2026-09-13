"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function StudentTabs({ studentId }: { studentId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/students/${studentId}`;

  const tabs = [
    { href: base, label: "Visão Geral" },
    { href: `${base}/anamnese`, label: "Anamnese" },
    { href: `${base}/checkins`, label: "Check-ins" },
    { href: `${base}/workouts`, label: "Treinos" },
    { href: `${base}/workouts/history`, label: "Histórico" },
    { href: `${base}/assessments`, label: "Antropometria" },
    { href: `${base}/nutrition`, label: "Nutrição" },
    { href: `${base}/finance`, label: "Financeiro" },
  ];

  return (
    <div className="tf-hairline -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2.5 text-sm transition-colors",
              active
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
