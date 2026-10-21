"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Seleção múltipla com botões visíveis (chips), pensada para o celular.
 * Diferente do MultiSelect (dropdown), todas as opções ficam na tela o tempo todo:
 * nada fica escondido dentro de uma lista que fecha ao rolar.
 *
 * Com `name`, cada item selecionado vira um input hidden — FormData.getAll(name) captura todos.
 */
export function ChipMultiSelect({
  name,
  options,
  value,
  onChange,
  className = "grid grid-cols-2 gap-2 sm:grid-cols-3",
  ariaLabel,
}: {
  name?: string;
  options: { label: string; value: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Classes do grid (ex.: "grid grid-cols-7 gap-1.5"). Literais, para o Tailwind gerar as classes. */
  className?: string;
  ariaLabel?: string;
}) {
  function toggle(item: string) {
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  }

  return (
    <div role="group" aria-label={ariaLabel} className={className}>
      {name && value.map((v) => <input key={v} type="hidden" name={name} value={v} />)}

      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(opt.value)}
            className={cn(
              "tf-tap flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius)] border px-2 text-sm transition-colors",
              active
                ? "border-[var(--primary)] bg-[var(--primary)] font-medium text-[var(--primary-foreground)]"
                : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--muted)]"
            )}
          >
            {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
