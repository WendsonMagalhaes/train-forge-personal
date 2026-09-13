import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveBranding } from "@/lib/theme/resolve-brand-color";
import { buildBrandStyle } from "@/lib/theme/brand-color";
import { AppBottomNav } from "@/components/layout/app-bottom-nav";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/layout/avatar";
import {
  Users, Dumbbell, LineChart, Wallet, CalendarDays, MessageSquare, BarChart3, LogOut, Palette, UserCircle,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

// Ordem importa: os 4 primeiros viram abas fixas no rodapé no celular; o
// resto some pra dentro do sheet "Mais" (ver AppBottomNav).
const nav: NavItem[] = [
  { href: "/dashboard", label: "Visão Geral", icon: BarChart3 },
  { href: "/dashboard/students", label: "Alunos", icon: Users },
  { href: "/dashboard/schedule", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/chat", label: "Mensagens", icon: MessageSquare },
  { href: "/dashboard/exercises", label: "Exercícios", icon: Dumbbell },
  { href: "/dashboard/assessments", label: "Avaliações", icon: LineChart },
  { href: "/dashboard/finance", label: "Financeiro", icon: Wallet },
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircle },
  { href: "/dashboard/settings", label: "Personalização", icon: Palette },
];

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const branding = await resolveBranding(session);
  // busca direto no banco (não da sessão/JWT) pra sempre refletir a foto mais recente
  const [me] = await db
    .select({
      name: users.name,
      image: users.image,
      avatarZoomPct: users.avatarZoomPct,
      avatarPositionX: users.avatarPositionX,
      avatarPositionY: users.avatarPositionY,
    })
    .from(users)
    .where(eq(users.id, session!.user.id))
    .limit(1);

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
    <div className="flex min-h-screen" style={buildBrandStyle(branding.brandColor)}>
      {/* Sidebar — visível a partir de md (tablet/desktop) */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-5 md:flex md:flex-col">
        <div className="mb-8">
          <Logo logoUrl={branding.logoUrl} sizePct={branding.logoSizePct} positionX={branding.logoPositionX} positionY={branding.logoPositionY} className="h-7 w-auto" />
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
          <Link href="/dashboard/profile" className="tf-tap flex min-w-0 items-center gap-2 hover:text-[var(--foreground)]">
            {me?.image ? (
              <Avatar
                imageUrl={me.image}
                name={me.name ?? ""}
                zoomPct={me.avatarZoomPct}
                positionX={me.avatarPositionX}
                positionY={me.avatarPositionY}
                className="h-6 w-6"
              />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[10px] font-semibold text-[var(--primary)]">
                {me?.name?.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate">{me?.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell align="left" side="top" />
            <ThemeToggle />
          </div>
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
        {/* Shell mobile — header fixo com blur + respiro pro notch, no estilo do portal do aluno */}
        <div className="tf-hairline sticky top-0 z-20 bg-[var(--surface)]/90 backdrop-blur-md md:hidden">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <Logo logoUrl={branding.logoUrl} sizePct={branding.logoSizePct} positionX={branding.logoPositionX} positionY={branding.logoPositionY} className="h-6 w-auto" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
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
