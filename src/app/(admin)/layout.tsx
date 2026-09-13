import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppBottomNav } from "@/components/layout/app-bottom-nav";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { LayoutDashboard, Users, Dumbbell, LogOut, ShieldCheck, Wallet, CalendarDays, Repeat } from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const nav: NavItem[] = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/sessions", label: "Sessões", icon: CalendarDays },
  { href: "/admin/payments", label: "Pagamentos", icon: Wallet },
  { href: "/admin/exercises", label: "Exercícios", icon: Dumbbell },
  { href: "/admin/cycles", label: "Ciclos", icon: Repeat },
  { href: "/admin/plans", label: "Planos", icon: Wallet },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const signOutForm = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-3 text-sm text-[var(--foreground)]">
        <LogOut className="h-4 w-4" /> Sair
      </button>
    </form>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-5 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--tf-ember)]" />
          <span className="font-display text-xl">ADMIN</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--background)] hover:text-[var(--primary)]"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="tf-hairline mb-3 flex items-center justify-between pb-3 pt-3 text-xs text-[var(--muted)]">
          <span className="truncate">{session?.user?.name}</span>
          <ThemeToggle />
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="flex items-center gap-2 text-xs text-[var(--muted)] transition-colors hover:text-[var(--primary)]">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="tf-hairline sticky top-0 z-20 bg-[var(--surface)]/90 backdrop-blur-md md:hidden">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--tf-ember)]" />
              <span className="font-display text-lg">ADMIN</span>
            </div>
            <ThemeToggle />
          </div>
          <OfflineBanner />
        </div>

        <main className="p-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <AppBottomNav
        items={nav.map((item) => ({ href: item.href, label: item.label, icon: <item.icon className="h-5 w-5" /> }))}
        primaryCount={4}
        title="Mais"
        extra={signOutForm}
      />
    </div>
  );
}
