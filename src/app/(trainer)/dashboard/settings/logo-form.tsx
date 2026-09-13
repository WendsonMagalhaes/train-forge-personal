"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateLogo, removeLogo } from "@/lib/actions/settings";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Logo } from "@/components/layout/logo";
import { extractPaletteFromImageUrl } from "@/lib/color-extract";
import { X } from "lucide-react";

export function LogoForm({
  currentLogoUrl,
  currentSizePct = 100,
  currentPositionX = 50,
  currentPositionY = 50,
}: {
  currentLogoUrl: string | null;
  currentSizePct?: number;
  currentPositionX?: number;
  currentPositionY?: number;
}) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl ?? "");
  const [sizePct, setSizePct] = useState(currentSizePct);
  const [positionX, setPositionX] = useState(currentPositionX);
  const [positionY, setPositionY] = useState(currentPositionY);
  const [palette, setPalette] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);

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

  async function handleLogoChange(url: string) {
    setLogoUrl(url);
    if (!url) {
      setPalette([]);
      return;
    }
    setExtracting(true);
    try {
      const colors = await extractPaletteFromImageUrl(url);
      setPalette(colors);
    } finally {
      setExtracting(false);
    }
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const res = await removeLogo();
      if (res?.error) {
        toast({ variant: "error", description: res.error });
      } else {
        setLogoUrl("");
        setSizePct(100);
        setPositionX(50);
        setPositionY(50);
        setPalette([]);
        toast({ variant: "success", description: "Logo removida — voltou pra logo padrão do Train Forge." });
      }
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FileUpload
        name="logoUrl"
        label="Sua logo"
        kind="trainer-logo"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        defaultValue={currentLogoUrl}
        preview="image"
        onChange={handleLogoChange}
      />
      <p className="text-xs text-[var(--muted)]">
        Formato horizontal funciona melhor. PNG ou SVG com fundo transparente é o ideal — ela aparece igual no
        modo claro e escuro.
      </p>

      {logoUrl && (
        <div className="flex flex-col gap-4 rounded-[var(--radius)] bg-[var(--background)] p-3">
          <div>
            <p className="mb-2 text-xs text-[var(--muted)]">Pré-visualização (como aparece no menu)</p>
            <div className="flex h-12 items-center overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3">
              <Logo logoUrl={logoUrl} sizePct={sizePct} positionX={positionX} positionY={positionY} className="h-6 w-auto" />
            </div>
          </div>

          <div>
            <Label htmlFor="logoSizePct" className="flex items-center justify-between text-xs">
              <span>Tamanho</span>
              <span className="text-[var(--muted)]">{sizePct}%</span>
            </Label>
            <input
              id="logoSizePct"
              type="range"
              min={50}
              max={300}
              step={5}
              value={sizePct}
              onChange={(e) => setSizePct(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--primary)]"
            />
          </div>
          <div>
            <Label htmlFor="logoPositionX" className="flex items-center justify-between text-xs">
              <span>Posição horizontal</span>
              <span className="text-[var(--muted)]">{positionX}%</span>
            </Label>
            <input
              id="logoPositionX"
              type="range"
              min={0}
              max={100}
              value={positionX}
              onChange={(e) => setPositionX(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--primary)]"
            />
          </div>
          <div>
            <Label htmlFor="logoPositionY" className="flex items-center justify-between text-xs">
              <span>Posição vertical</span>
              <span className="text-[var(--muted)]">{positionY}%</span>
            </Label>
            <input
              id="logoPositionY"
              type="range"
              min={0}
              max={100}
              value={positionY}
              onChange={(e) => setPositionY(Number(e.target.value))}
              className="mt-1 w-full accent-[var(--primary)]"
            />
          </div>

          {extracting && <p className="text-xs text-[var(--muted)]">Analisando cores da logo…</p>}
        </div>
      )}

      <input type="hidden" name="logoSizePct" value={sizePct} />
      <input type="hidden" name="logoPositionX" value={positionX} />
      <input type="hidden" name="logoPositionY" value={positionY} />
      <input type="hidden" name="logoPaletteColors" value={JSON.stringify(palette)} />

      <div className="flex items-center gap-4">
        <Button type="submit" size="sm" disabled={pending}>
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
