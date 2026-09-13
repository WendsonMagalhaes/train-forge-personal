"use client";

import { useState, useTransition } from "react";
import { updateBrandColor } from "@/lib/actions/settings";
import { BRAND_COLOR_PRESETS, DEFAULT_BRAND_COLOR, isValidHex, darken, contrastText } from "@/lib/theme/brand-color";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function BrandColorForm({ currentColor, logoColors = [] }: { currentColor: string | null; logoColors?: string[] }) {
  const [color, setColor] = useState(currentColor && isValidHex(currentColor) ? currentColor : DEFAULT_BRAND_COLOR);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function save(next: string) {
    setColor(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("brandColor", next);
      const res = await updateBrandColor(fd);
      if (res?.error) {
        toast({ variant: "error", description: res.error });
      } else {
        toast({ variant: "success", description: "Cor da marca atualizada." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* presets */}
      <div>
        <p className="mb-2 text-xs text-[var(--muted)]">Cores sugeridas</p>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.name}
              onClick={() => save(preset.value)}
              className={cn(
                "h-9 w-9 rounded-[var(--radius)] border-2 transition-transform hover:scale-105",
                color.toLowerCase() === preset.value ? "border-[var(--foreground)]" : "border-transparent"
              )}
              style={{ background: preset.value }}
            />
          ))}
        </div>
      </div>

      {/* cores extraídas da logo */}
      {logoColors.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-[var(--muted)]">Cores da sua logo</p>
          <div className="flex flex-wrap gap-2">
            {logoColors.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                onClick={() => save(hex)}
                className={cn(
                  "h-9 w-9 rounded-[var(--radius)] border-2 transition-transform hover:scale-105",
                  color.toLowerCase() === hex.toLowerCase() ? "border-[var(--foreground)]" : "border-transparent"
                )}
                style={{ background: hex }}
              />
            ))}
          </div>
        </div>
      )}

      {/* custom picker */}
      <div>
        <p className="mb-2 text-xs text-[var(--muted)]">Ou escolha uma cor personalizada</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => save(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-transparent p-1"
          />
          <span className="font-mono text-sm text-[var(--muted)]">{color}</span>
        </div>
      </div>

      {/* live preview */}
      <div>
        <p className="mb-2 text-xs text-[var(--muted)]">Pré-visualização</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium"
            style={{ background: color, color: contrastText(color) }}
          >
            Salvar treino
          </button>
          <button
            type="button"
            className="rounded-[var(--radius)] px-4 py-2 text-sm font-medium"
            style={{ background: darken(color), color: contrastText(darken(color)) }}
          >
            hover
          </button>
        </div>
      </div>

      {pending && <p className="text-xs text-[var(--muted)]">Salvando…</p>}
    </div>
  );
}
