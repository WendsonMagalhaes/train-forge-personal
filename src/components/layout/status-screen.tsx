import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buildBrandStyle } from "@/lib/theme/brand-color";
import type { Branding } from "@/lib/theme/resolve-brand-color";

/**
 * Tela de status (404, sem conexão...) com a marca do personal em destaque.
 * O ícone fica ao fundo, grande e suave, como papel de parede, com um brilho
 * da cor da marca por trás. O zoom/posição salvos pelo personal não se aplicam
 * aqui, para a logo ficar centralizada.
 * Sem hooks, então funciona em componente de servidor e de cliente.
 */
export function StatusScreen({
  branding, icon: Icon, code, title, description, children,
}: {
  branding: Branding | null;
  icon: LucideIcon;
  code?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center gap-10 overflow-hidden bg-[var(--background)] px-6 text-center"
      style={buildBrandStyle(branding?.brandColor ?? null)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--primary)_0%,transparent_65%)] opacity-[0.12] blur-3xl"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Icon className="h-[34rem] w-[34rem] text-[var(--primary)] opacity-[0.07]" strokeWidth={1.25} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10">
        <Logo
          logoUrl={branding?.logoUrl}
          logoDarkUrl={branding?.logoDarkUrl}
          className="h-32 w-auto max-w-[440px] object-contain drop-shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
        />

        <div className="max-w-sm">
          {code && (
            <p className="bg-gradient-to-b from-[var(--primary)] to-transparent bg-clip-text font-display text-7xl leading-none text-transparent">
              {code}
            </p>
          )}
          <h1 className="mt-3 font-display text-2xl">{title}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        </div>

        {children}
      </div>
    </main>
  );
}
