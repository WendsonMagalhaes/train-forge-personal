"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import { updateLogo, removeLogo } from "@/lib/actions/settings";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Logo } from "@/components/layout/logo";
import { extractPaletteFromImageUrl } from "@/lib/color-extract";
import { removeLogoBackground, adaptLogoForTheme } from "@/lib/logo-background";
import { Eraser, Loader2, Moon, Sparkles, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

type Variant = "light" | "dark";

const MINI_BTN =
  "tf-tap inline-flex h-8 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border)] px-2.5 text-xs transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-50";

export function LogoForm({
  currentLogoUrl,
  currentLogoDarkUrl = null,
  currentSizePct = 100,
  currentPositionX = 50,
  currentPositionY = 50,
}: {
  currentLogoUrl: string | null;
  currentLogoDarkUrl?: string | null;
  currentSizePct?: number;
  currentPositionX?: number;
  currentPositionY?: number;
}) {
  const { toast } = useToast();
  const [lightUrl, setLightUrl] = useState(currentLogoUrl ?? "");
  const [darkUrl, setDarkUrl] = useState(currentLogoDarkUrl ?? "");
  const [sizePct, setSizePct] = useState(currentSizePct);
  const [positionX, setPositionX] = useState(currentPositionX);
  const [positionY, setPositionY] = useState(currentPositionY);
  const [palette, setPalette] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState<{ error?: string; success?: boolean } | undefined, FormData>(
    async (_prev, formData) => (await updateLogo(formData)) ?? {},
    undefined
  );
  const [removing, startRemoveTransition] = useTransition();

  useEffect(() => {
    if (state?.success) {
      toast({ variant: "success", description: "Logo atualizada." });
    } else if (state?.error) {
      toast({ variant: "error", description: state.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // A paleta de cores da marca sai da versão clara (é a logo principal).
  async function handleLightChange(url: string) {
    setLightUrl(url);
    if (!url) {
      setPalette([]);
      return;
    }
    setExtracting(true);
    try {
      setPalette(await extractPaletteFromImageUrl(url));
    } finally {
      setExtracting(false);
    }
  }

  async function uploadBlob(blob: Blob, fileName: string) {
    const uploaded = await upload(fileName, blob, {
      access: "public",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ kind: "trainer-logo" }),
    });
    return uploaded.url;
  }

  async function runImageAction(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      toast({
        variant: "error",
        description: err instanceof Error ? err.message : "Não foi possível processar a logo.",
      });
    } finally {
      setBusy(null);
    }
  }

  function removeBackground(variant: Variant) {
    const source = variant === "light" ? lightUrl : darkUrl;
    if (!source) return;
    runImageAction(`bg-${variant}`, async () => {
      const blob = await removeLogoBackground(source);
      if (!blob) {
        toast({ variant: "success", description: "Essa logo já está com fundo transparente." });
        return;
      }
      const url = await uploadBlob(blob, `logo-${variant}-sem-fundo.png`);
      if (variant === "light") await handleLightChange(url);
      else setDarkUrl(url);
      toast({ variant: "success", description: "Fundo removido. Clique em Salvar logo para aplicar." });
    });
  }

  // Cria a versão para o tema `target` a partir da outra logo.
  function generateVariant(target: Variant) {
    const source = target === "dark" ? lightUrl : darkUrl;
    if (!source) return;
    runImageAction(`adapt-${target}`, async () => {
      const blob = await adaptLogoForTheme(source, target);
      const url = await uploadBlob(blob, `logo-${target}.png`);
      if (target === "dark") setDarkUrl(url);
      else await handleLightChange(url);
      toast({
        variant: "success",
        description: `Versão para o tema ${target === "dark" ? "escuro" : "claro"} criada. Clique em Salvar logo para aplicar.`,
      });
    });
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const res = await removeLogo();
      if (res?.error) {
        toast({ variant: "error", description: res.error });
      } else {
        setLightUrl("");
        setDarkUrl("");
        setSizePct(100);
        setPositionX(50);
        setPositionY(50);
        setPalette([]);
        toast({ variant: "success", description: "Logo removida — voltou pra logo padrão do Train Forge." });
      }
    });
  }

  const adjust = { sizePct, positionX, positionY };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Tema claro */}
        <LogoSlot
          variant="light"
          title="Tema claro"
          icon={<Sun className="h-3.5 w-3.5" />}
          previewClassName="bg-white"
          url={lightUrl}
          busyKey={busy}
          onRemoveBackground={() => removeBackground("light")}
          onGenerate={() => generateVariant("dark")}
          generateLabel="Criar versão escura"
          canGenerate={!!lightUrl && !darkUrl}
          adjust={adjust}
          upload={
            <FileUpload
              name="logoUrl"
              label="Logo para o tema claro"
              kind="trainer-logo"
              accept={ACCEPT}
              defaultValue={currentLogoUrl}
              value={lightUrl}
              compact
              onChange={handleLightChange}
            />
          }
        />

        {/* Tema escuro (opcional) */}
        <LogoSlot
          variant="dark"
          title="Tema escuro"
          hint="opcional"
          icon={<Moon className="h-3.5 w-3.5" />}
          previewClassName="bg-[#141311]"
          url={darkUrl}
          fallbackUrl={lightUrl}
          busyKey={busy}
          onRemoveBackground={() => removeBackground("dark")}
          onGenerate={() => generateVariant("light")}
          generateLabel="Criar versão clara"
          canGenerate={!!darkUrl && !lightUrl}
          adjust={adjust}
          upload={
            <FileUpload
              name="logoDarkUrl"
              label="Logo para o tema escuro"
              kind="trainer-logo"
              accept={ACCEPT}
              defaultValue={currentLogoDarkUrl}
              value={darkUrl}
              compact
              onChange={setDarkUrl}
            />
          }
        />
      </div>

      <p className="-mt-2 text-xs text-[var(--muted)]">
        Sem logo escura, a clara é usada nos dois temas. <b className="text-[var(--foreground)]">Criar versão</b> troca
        as partes pretas (ou brancas) automaticamente e mantém as cores da marca.
      </p>

      {lightUrl && (
        <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-medium text-[var(--muted)]">Ajuste (vale para as duas)</p>
          <Slider id="logoSizePct" label="Tamanho" value={sizePct} display={`${sizePct}%`} min={50} max={300} step={5} onChange={setSizePct} />
          <Slider id="logoPositionX" label="Posição horizontal" value={positionX} display={`${positionX}%`} min={0} max={100} onChange={setPositionX} />
          <Slider id="logoPositionY" label="Posição vertical" value={positionY} display={`${positionY}%`} min={0} max={100} onChange={setPositionY} />
          {extracting && <p className="text-xs text-[var(--muted)]">Analisando cores da logo…</p>}
        </div>
      )}

      <input type="hidden" name="logoSizePct" value={sizePct} />
      <input type="hidden" name="logoPositionX" value={positionX} />
      <input type="hidden" name="logoPositionY" value={positionY} />
      <input type="hidden" name="logoPaletteColors" value={JSON.stringify(palette)} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button type="submit" disabled={pending || !!busy} className="w-full sm:w-auto">
          {pending ? "Salvando…" : "Salvar logo"}
        </Button>
        {currentLogoUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" /> Remover logo
          </button>
        )}
      </div>
    </form>
  );
}

function LogoSlot({
  variant, title, hint, icon, previewClassName, url, fallbackUrl, busyKey, onRemoveBackground, onGenerate,
  generateLabel, canGenerate, adjust, upload,
}: {
  variant: Variant;
  title: string;
  hint?: string;
  icon: ReactNode;
  previewClassName: string;
  url: string;
  fallbackUrl?: string;
  busyKey: string | null;
  onRemoveBackground: () => void;
  onGenerate: () => void;
  generateLabel: string;
  canGenerate: boolean;
  adjust: { sizePct: number; positionX: number; positionY: number };
  upload: ReactNode;
}) {
  const showFallback = !url && !!fallbackUrl;
  const previewUrl = url || fallbackUrl || "";
  const isBusy = busyKey !== null;
  const other: Variant = variant === "light" ? "dark" : "light";

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
          {icon} {title}
        </span>
        {hint && <span className="text-[11px] text-[var(--muted)]">{hint}</span>}
      </div>

      {/* Prévia no fundo do próprio tema */}
      <div
        className={cn(
          "flex h-24 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-[var(--border)] px-4",
          previewClassName
        )}
      >
        {previewUrl ? (
          <div className={cn("relative flex h-full w-full items-center justify-center", showFallback && "opacity-40")}>
            <Logo
              logoUrl={previewUrl}
              sizePct={adjust.sizePct}
              positionX={adjust.positionX}
              positionY={adjust.positionY}
              className="max-h-14 w-auto max-w-full"
            />
          </div>
        ) : (
          <span className="text-xs text-[var(--muted)]">Sem logo</span>
        )}
      </div>
      {showFallback && <p className="-mt-1 text-[11px] text-[var(--muted)]">Usando a clara neste tema.</p>}

      <div className="flex flex-wrap items-center gap-2">{upload}</div>

      {url && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
          <button type="button" className={cn(MINI_BTN, "bg-[var(--background)]")} disabled={isBusy} onClick={onRemoveBackground}>
            {busyKey === `bg-${variant}` ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eraser className="h-3.5 w-3.5" />
            )}
            Tirar fundo
          </button>
          {canGenerate && (
            <button type="button" className={cn(MINI_BTN, "bg-[var(--background)]")} disabled={isBusy} onClick={onGenerate}>
              {busyKey === `adapt-${other}` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {generateLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Slider({
  id, label, value, display, min, max, step, onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-[var(--muted)]">{display}</span>
      </Label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--primary)]"
      />
    </div>
  );
}
