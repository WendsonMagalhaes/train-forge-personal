import type { CSSProperties } from "react";

/**
 * Renderiza os dois SVGs (claro/escuro) e alterna via CSS (.tf-logo-light /
 * .tf-logo-dark, ver globals.css) — evita flash/mismatch de hidratação que
 * um `useTheme()` client-side teria em componentes de layout server-side.
 *
 * `sizePct`/`positionX`/`positionY` só se aplicam à logo personalizada do
 * personal (a logo padrão do sistema já vem no tamanho certo). `sizePct`
 * amplia visualmente a logo via `transform: scale()` sem afetar o espaço
 * reservado no layout (então pode "vazar" pro respiro ao redor sem empurrar
 * o resto da UI) — resolve o caso comum de logo com bastante espaço vazio
 * no próprio arquivo, que aparece pequena mesmo numa caixa alta.
 * `positionX`/`positionY` (0-100) definem a partir de que ponto ela cresce.
 */
export function Logo({
  logoUrl,
  className = "h-6 w-auto",
  sizePct = 100,
  positionX = 50,
  positionY = 50,
}: {
  logoUrl?: string | null;
  className?: string;
  sizePct?: number;
  positionX?: number;
  positionY?: number;
}) {
  if (logoUrl) {
    const style: CSSProperties = {
      transformOrigin: `${positionX}% ${positionY}%`,
      objectPosition: `${positionX}% ${positionY}%`,
      transform: sizePct !== 100 ? `scale(${sizePct / 100})` : undefined,
    };
    // Logo personalizada do personal — substitui a do sistema (mesma imagem em ambos os temas).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt="Logo" className={`${className} object-contain`} style={style} />;
  }

  return (
    <>
      <img src="/brand/logo-horizontal-light.svg" alt="Train Forge" className={`tf-logo-light ${className}`} />
      <img src="/brand/logo-horizontal-dark.svg" alt="Train Forge" className={`tf-logo-dark ${className}`} />
    </>
  );
}

export function LogoMark({ className = "h-8 w-auto" }: { className?: string }) {
  return <img src="/brand/logo-mark.svg" alt="Train Forge" className={className} />;
}
