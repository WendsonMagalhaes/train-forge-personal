// Roda antes da hidratação do React (inline no <head>) para decidir dark/light
// sem causar flash de tema errado. Prioridade: cookie > localStorage > preferência do SO > dark (padrão da marca).
import Script from "next/script";

const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('tf-theme');
    if (!stored) {
      var match = document.cookie.match(/(?:^|; )tf-theme=([^;]+)/);
      stored = match ? decodeURIComponent(match[1]) : null;
    }
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    var root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  } catch (e) {}
})();
`;

export function ThemeScript() {
  // `next/script` com strategy "beforeInteractive" é a forma suportada de
  // injetar um script inline que precisa rodar antes da hidratação — uma tag
  // <script> "crua" renderizada por um componente React não é mais permitida
  // (o React nunca a executa no client e agora avisa/erra sobre isso).
  // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- App Router: beforeInteractive é suportado (e recomendado) em app/layout.tsx, a regra é da convenção antiga do Pages Router.
  return <Script id="tf-theme-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
