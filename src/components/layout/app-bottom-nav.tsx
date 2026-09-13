"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppNavItem = {
  href: string;
  label: string;
  /**
   * Ícone JÁ RENDERIZADO (ex.: `<Users className="h-5 w-5" />`), não o
   * componente em si. Como este array é montado num Server Component e
   * passado pra este Client Component, passar a referência da função do
   * ícone quebra ("Functions cannot be passed directly to Client
   * Components..."). Um elemento React já renderizado serializa normalmente.
   */
  icon: ReactNode;
};

export function AppBottomNav({
  items,
  primaryCount = 4,
  title,
  extra,
}: {
  items: AppNavItem[];
  primaryCount?: number;
  /** Título mostrado no topo do sheet "Mais" */
  title?: string;
  /** Conteúdo extra no fim do sheet (ex.: botão de sair) */
  extra?: ReactNode;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const primary = items.slice(0, primaryCount);
  const overflow = items.slice(primaryCount);
  const hasOverflow = overflow.length > 0;
  const overflowActive = overflow.some((item) => isActive(pathname, item.href));

  useEffect(() => setSheetOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  return (
    <>
      <nav
        className="tf-hairline fixed bottom-0 left-0 right-0 z-20 flex items-stretch justify-around bg-[var(--surface)]/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primary.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "tf-tap flex min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-[var(--primary)]" : "text-[var(--muted)]"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={cn(
              "tf-tap flex min-w-[56px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors",
              overflowActive ? "text-[var(--primary)]" : "text-[var(--muted)]"
            )}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={overflowActive ? 2.5 : 2} />
            Mais
          </button>
        )}
      </nav>

      {sheetOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSheetOpen(false)} aria-hidden="true" />
          <div
            className="tf-hairline absolute bottom-0 left-0 right-0 rounded-t-2xl border bg-[var(--surface)] p-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-base">{title ?? "Mais"}</span>
              <button onClick={() => setSheetOpen(false)} aria-label="Fechar">
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {overflow.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "tf-tap flex items-center gap-3 rounded-[var(--radius)] px-3 py-3 text-sm",
                      active ? "bg-[var(--background)] text-[var(--primary)]" : "text-[var(--foreground)]"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
            {extra && <div className="tf-hairline mt-2 border-t pt-2">{extra}</div>}
          </div>
        </div>
      )}
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
