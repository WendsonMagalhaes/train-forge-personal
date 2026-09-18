import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveBranding } from "@/lib/theme/resolve-brand-color";
import { buildBrandStyle } from "@/lib/theme/brand-color";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PortalBottomNav } from "@/components/layout/portal-bottom-nav";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { logoutAction } from "@/lib/actions/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col" style={buildBrandStyle(branding.brandColor)}>
      <div className="tf-hairline sticky top-0 z-20 bg-[var(--surface)]/90 backdrop-blur-md">
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          <Logo logoUrl={branding.logoUrl} sizePct={branding.logoSizePct} positionX={branding.logoPositionX} positionY={branding.logoPositionY} className="h-5 w-auto" />
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

      <PortalBottomNav />
    </div>
  );
}