"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "android" | "ios";

const STEPS: Record<Platform, string[]> = {
  android: [
    "Toque nos três pontinhos ⋮ no canto superior do Chrome.",
    'Escolha "Instalar aplicativo" (ou "Adicionar à tela inicial").',
    'Confirme em "Instalar". Pronto: o Train Forge fica na sua tela inicial.',
  ],
  ios: [
    "Abra o link no Safari e toque no ícone de compartilhar (quadrado com seta para cima).",
    'Role a lista e toque em "Adicionar à Tela de Início".',
    'Toque em "Adicionar" no canto superior direito. Pronto!',
  ],
};

/* Animações em CSS puro (ciclo de 8s). Desligadas para quem prefere menos movimento. */
const CSS = `
.tfig-phone{position:relative;width:200px;height:380px;margin:0 auto;box-sizing:border-box;border:6px solid #1d1d24;border-radius:34px;background:#f2f3f5;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#1b1b1f}
.tfig-screen{position:absolute;inset:0;overflow:hidden;background:#f2f3f5}
.tfig-page{position:absolute;top:40px;left:0;right:0;bottom:0;padding:12px;display:flex;flex-direction:column;gap:8px}
.tfig-ios .tfig-page{top:30px;bottom:44px}
.tfig-hero{height:90px;border-radius:10px;background:linear-gradient(135deg,#f0a58a,#d9583a)}
.tfig-card{height:44px;border-radius:10px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.tfig-line{height:8px;border-radius:4px;background:#d6d8de;width:70%}
.tfig-chrome{position:absolute;top:0;left:0;right:0;height:40px;background:#fff;display:flex;align-items:center;gap:6px;padding:0 8px;border-bottom:1px solid #e3e3e8;z-index:2}
.tfig-url{flex:1;height:24px;border-radius:12px;background:#eef0f4;font-size:9px;line-height:24px;padding:0 10px;color:#555;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.tfig-dots{position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#333}
.tfig-ring{position:absolute;inset:-4px;border-radius:50%;border:2px solid #1a5fd6;opacity:0}
.tfig-menu{position:absolute;top:44px;right:8px;width:150px;background:#fff;border-radius:10px;box-shadow:0 8px 20px rgba(0,0,0,.25);padding:4px;z-index:6;opacity:0;animation:tfig-menu-a 8s infinite}
.tfig-menu-row{height:28px;display:flex;align-items:center;padding:0 8px;font-size:10px;color:#222;border-radius:6px}
.tfig-menu-target{font-weight:700;color:#1a5fd6;animation:tfig-hl-a 8s infinite}
.tfig-dialog{position:absolute;left:14px;right:14px;top:128px;background:#fff;border-radius:14px;padding:14px 12px;z-index:7;box-shadow:0 12px 30px rgba(0,0,0,.3);opacity:0;animation:tfig-dlg-a 8s infinite}
.tfig-dialog-title{font-size:11px;font-weight:700;margin-bottom:4px}
.tfig-dialog-sub{font-size:9px;color:#666}
.tfig-dialog-btns{display:flex;justify-content:flex-end;gap:12px;font-size:10px;margin-top:12px}
.tfig-btn-ok{color:#1a5fd6;font-weight:700}
.tfig-safari{position:absolute;left:0;right:0;bottom:0;height:44px;background:#fff;border-top:1px solid #dcdce2;display:flex;justify-content:space-around;align-items:center;color:#1a5fd6;z-index:4;font-size:16px}
.tfig-share{position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:8px}
.tfig-share-ring{position:absolute;inset:-3px;border-radius:9px;border:2px solid #1a5fd6;opacity:0;animation:tfig-ring-i 8s infinite}
.tfig-sheet{position:absolute;left:8px;right:8px;bottom:50px;height:150px;background:#f7f7fa;border-radius:14px;padding:8px;z-index:6;transform:translateY(calc(100% + 60px));box-shadow:0 -4px 16px rgba(0,0,0,.2);animation:tfig-sheet-i 8s infinite}
.tfig-sheet-row{height:34px;display:flex;align-items:center;justify-content:center;font-size:10px;background:#fff;border-radius:8px;margin-bottom:6px;color:#222}
.tfig-sheet-target{font-weight:700;color:#1a5fd6;animation:tfig-hl-i 8s infinite}
.tfig-add-card{position:absolute;top:40px;left:12px;right:12px;height:150px;background:#f7f7fa;border-radius:14px;padding:10px;z-index:6;box-shadow:0 8px 20px rgba(0,0,0,.2);opacity:0;animation:tfig-card-i 8s infinite}
.tfig-add-top{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#1a5fd6;margin-bottom:10px}
.tfig-add-top b{font-weight:700}
.tfig-app-row{display:flex;align-items:center;gap:8px;background:#fff;border-radius:10px;padding:8px;font-size:10px;font-weight:600}
.tfig-home{position:absolute;inset:0;z-index:5;background:linear-gradient(160deg,#2b2f5a,#15172e);padding:28px 14px;opacity:0}
.tfig-android .tfig-home{animation:tfig-home-a 8s infinite}
.tfig-ios .tfig-home{animation:tfig-home-i 8s infinite}
.tfig-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 8px;justify-items:center}
.tfig-tile{width:34px;height:34px;border-radius:9px;background:rgba(255,255,255,.18)}
.tfig-appcell{display:flex;flex-direction:column;align-items:center;gap:3px}
.tfig-appcell span{font-size:7px;color:#fff}
.tfig-newicon{width:34px;height:34px;border-radius:9px;background:var(--primary,#e8603c);color:#fff;font-weight:800;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(255,255,255,.6)}
.tfig-android .tfig-newicon{animation:tfig-pop-a 8s infinite}
.tfig-ios .tfig-newicon{animation:tfig-pop-i 8s infinite}
.tfig-finger{position:absolute;left:0;top:0;width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.7);border:2px solid rgba(20,20,30,.6);box-shadow:0 0 0 2px rgba(255,255,255,.4);z-index:10;pointer-events:none;opacity:0}
.tfig-android .tfig-finger{animation:tfig-finger-a 8s infinite}
.tfig-ios .tfig-finger{animation:tfig-finger-i 8s infinite}
@keyframes tfig-menu-a{0%,14%{opacity:0;transform:translateY(-6px)}20%,68%{opacity:1;transform:none}72%,100%{opacity:0}}
@keyframes tfig-ring-a{0%,10%{opacity:0;transform:scale(.6)}14%,20%{opacity:1;transform:scale(1)}24%,100%{opacity:0}}
@keyframes tfig-hl-a{0%,38%{background:transparent}42%,66%{background:#e8eefc}70%,100%{background:transparent}}
@keyframes tfig-dlg-a{0%,68%{opacity:0;transform:scale(.92)}72%,86%{opacity:1;transform:scale(1)}90%,100%{opacity:0}}
@keyframes tfig-home-a{0%,86%{opacity:0}90%,96%{opacity:1}100%{opacity:0}}
@keyframes tfig-pop-a{0%,88%{transform:scale(.3);opacity:0}94%{transform:scale(1.12);opacity:1}97%,100%{transform:scale(1);opacity:1}}
@keyframes tfig-finger-a{0%{left:150px;top:200px;opacity:0;transform:scale(1)}6%{opacity:1}14%{left:157px;top:9px}18%{transform:scale(.7)}22%{transform:scale(1)}36%{left:89px;top:107px}40%{transform:scale(.7)}44%{transform:scale(1)}60%{left:89px;top:107px}70%{left:133px;top:173px}74%{transform:scale(.7)}78%{transform:scale(1)}84%{opacity:1}88%,100%{opacity:0}}
@keyframes tfig-ring-i{0%,8%{opacity:0}11%,18%{opacity:1}22%,100%{opacity:0}}
@keyframes tfig-sheet-i{0%,12%{transform:translateY(calc(100% + 60px))}20%,56%{transform:none}62%,100%{transform:translateY(calc(100% + 60px))}}
@keyframes tfig-hl-i{0%,40%{background:#fff}42%,56%{background:#e8eefc}60%,100%{background:#fff}}
@keyframes tfig-card-i{0%,60%{opacity:0;transform:translateY(16px)}66%,80%{opacity:1;transform:none}86%,100%{opacity:0}}
@keyframes tfig-home-i{0%,84%{opacity:0}88%,96%{opacity:1}100%{opacity:0}}
@keyframes tfig-pop-i{0%,86%{transform:scale(.3);opacity:0}92%{transform:scale(1.12);opacity:1}95%,100%{transform:scale(1);opacity:1}}
@keyframes tfig-finger-i{0%{left:83px;top:350px;opacity:0;transform:scale(1)}6%{opacity:1}11%{left:83px;top:335px}15%{transform:scale(.7)}19%{transform:scale(1)}32%{left:83px;top:224px}36%{transform:scale(.7)}40%{transform:scale(1)}62%{left:83px;top:224px;opacity:1}66%{left:135px;top:45px}70%{transform:scale(.7)}74%{transform:scale(1)}80%{opacity:1}86%,100%{opacity:0}}
@media (prefers-reduced-motion: reduce){
  .tfig-phone *{animation:none !important}
  .tfig-home{opacity:1 !important}
  .tfig-newicon{opacity:1 !important;transform:none !important}
}
`;

function Tile() {
  return <div className="tfig-tile" />;
}

function AppIcon() {
  return (
    <div className="tfig-appcell">
      <div className="tfig-newicon">TF</div>
      <span>Train Forge</span>
    </div>
  );
}

function HomeScreen() {
  return (
    <div className="tfig-home">
      <div className="tfig-grid">
        <Tile />
        <Tile />
        <AppIcon />
        <Tile />
        <Tile />
        <Tile />
        <Tile />
        <Tile />
        <Tile />
        <Tile />
        <Tile />
        <Tile />
      </div>
    </div>
  );
}

function PageContent() {
  return (
    <div className="tfig-page">
      <div className="tfig-hero" />
      <div className="tfig-card" />
      <div className="tfig-line" />
      <div className="tfig-card" />
      <div className="tfig-line" style={{ width: "50%" }} />
    </div>
  );
}

function AndroidScene() {
  return (
    <div className="tfig-phone tfig-android">
      <div className="tfig-screen">
        <div className="tfig-chrome">
          <div className="tfig-url">trainforge.wdxsolutions.online</div>
          <div className="tfig-dots">
            ⋮
            <span className="tfig-ring" style={{ animation: "tfig-ring-a 8s infinite" }} />
          </div>
        </div>
        <PageContent />
        <div className="tfig-menu">
          <div className="tfig-menu-row">Nova guia</div>
          <div className="tfig-menu-row">Histórico</div>
          <div className="tfig-menu-row tfig-menu-target">Instalar aplicativo</div>
          <div className="tfig-menu-row">Configurações</div>
        </div>
        <div className="tfig-dialog">
          <div className="tfig-dialog-title">Instalar Train Forge?</div>
          <div className="tfig-dialog-sub">Ele será adicionado à sua tela inicial.</div>
          <div className="tfig-dialog-btns">
            <span>Cancelar</span>
            <span className="tfig-btn-ok">Instalar</span>
          </div>
        </div>
        <HomeScreen />
        <div className="tfig-finger" />
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" />
    </svg>
  );
}

function IosScene() {
  return (
    <div className="tfig-phone tfig-ios">
      <div className="tfig-screen">
        <div className="tfig-chrome" style={{ height: 30, justifyContent: "center", borderBottom: "none" }}>
          <div className="tfig-url" style={{ flex: "0 0 150px", textAlign: "center", padding: 0 }}>trainforge.wdxsolutions.online</div>
        </div>
        <PageContent />
        <div className="tfig-sheet">
          <div className="tfig-sheet-row">Copiar</div>
          <div className="tfig-sheet-row tfig-sheet-target">Adicionar à Tela de Início</div>
          <div className="tfig-sheet-row">Marcar</div>
        </div>
        <div className="tfig-add-card">
          <div className="tfig-add-top">
            <span>Cancelar</span>
            <b>Adicionar</b>
          </div>
          <div className="tfig-app-row">
            <div className="tfig-newicon" style={{ width: 28, height: 28, fontSize: 9 }}>TF</div>
            <span>Train Forge</span>
          </div>
        </div>
        <div className="tfig-safari">
          <span>‹</span>
          <span>›</span>
          <span className="tfig-share">
            <ShareIcon />
            <span className="tfig-share-ring" />
          </span>
          <span>📖</span>
          <span>⧉</span>
        </div>
        <HomeScreen />
        <div className="tfig-finger" />
      </div>
    </div>
  );
}

export function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("android");

  return (
    <div className="tf-panel p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Download className="h-4 w-4 text-[var(--primary)]" />
          Instalar o app no celular
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-xs text-[var(--muted)]">
            Instale o Train Forge como um app: ele abre em tela cheia, direto da sua tela inicial.
            No Android use o Chrome; no iPhone, o Safari.
          </p>

          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-[var(--radius)] border border-[var(--border)] p-1">
            {(["android", "ios"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={platform === p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "h-9 rounded-[calc(var(--radius)-2px)] text-sm transition-colors",
                  platform === p
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {p === "android" ? "Android" : "iPhone (iOS)"}
              </button>
            ))}
          </div>

          <style>{CSS}</style>
          <div key={platform} className="flex flex-col items-center gap-5">
            {platform === "android" ? <AndroidScene /> : <IosScene />}
            <ol className="flex w-full list-decimal flex-col gap-2 pl-5 text-sm">
              {STEPS[platform].map((step) => (
                <li key={step} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
