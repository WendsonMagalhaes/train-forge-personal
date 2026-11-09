import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveBranding } from "@/lib/theme/resolve-brand-color";
import { buildBrandStyle } from "@/lib/theme/brand-color";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppBottomNav } from "@/components/layout/app-bottom-nav";
import { Logo } from "@/components/layout/logo";
import { BrandingCache } from "@/components/theme/branding-cache";
import { UserMenu } from "@/components/layout/user-menu";
import { logoutAction } from "@/lib/actions/auth";
import { Home, Trophy, MessageSquare, LineChart, CalendarDays, Salad, Wallet } from "lucide-react";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // branding e dados do usuário são independentes: busca em paralelo
  // (o dado do usuário vai direto no banco, não da sessão/JWT, pra sempre refletir a foto mais recente)
  const [branding, [me]] = await Promise.all([
    resolveBranding(session),
    db
      .select({
        name: users.name,
        image: users.image,
        avatarZoomPct: users.avatarZoomPct,
        avatarPositionX: users.avatarPositionX,
        avatarPositionY: users.avatarPositionY,
      })
      .from(users)
      .where(eq(users.id, session!.user.id))
      .limit(1),
  ]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col" style={buildBrandStyle(branding.brandColor)}>
      <BrandingCache branding={branding} />
      <div className="tf-hairline sticky top-0 z-20 bg-[var(--surface)]/90 backdrop-blur-md">
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          <Logo logoUrl={branding.logoUrl} logoDarkUrl={branding.logoDarkUrl} sizePct={branding.logoSizePct} positionX={branding.logoPositionX} positionY={branding.logoPositionY} className="h-5 w-auto" />
          <div className="flex items-center gap-2">
            <UserMenu
              name={me?.name ?? ""}
              imageUrl={me?.image}
              avatarZoomPct={me?.avatarZoomPct}
              avatarPositionX={me?.avatarPositionX}
              avatarPositionY={me?.avatarPositionY}
              profileHref="/portal/profile"
              onSignOut={logoutAction}
            />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <OfflineBanner />
      </div>

      <main className="flex-1 px-5 py-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}>
        {children}
      </main>

      <AppBottomNav
        variant="column"
        primaryCount={4}
        title="Mais"
        items={[
          { href: "/portal", label: "Hoje", icon: <Home className="h-5 w-5" /> },
          { href: "/portal/grupos", label: "Grupos", icon: <Trophy className="h-5 w-5" /> },
          { href: "/portal/chat", label: "Chat", icon: <MessageSquare className="h-5 w-5" /> },
          { href: "/portal/progress", label: "Evolução", icon: <LineChart className="h-5 w-5" /> },
          { href: "/portal/schedule", label: "Agenda", icon: <CalendarDays className="h-5 w-5" /> },
          { href: "/portal/nutrition", label: "Nutrição", icon: <Salad className="h-5 w-5" /> },
          { href: "/portal/finance", label: "Financeiro", icon: <Wallet className="h-5 w-5" /> },
        ]}
      />
    </div>
  );
}