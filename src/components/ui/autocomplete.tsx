"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export type AutocompleteOption = {
  id: string;
  label: string;
  sublabel?: string;
};

type AutocompleteProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: AutocompleteOption[];
  onSelect: (option: AutocompleteOption) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
};

/**
 * Campo de busca com autocomplete: mostra um dropdown com as opções que
 * batem com o texto digitado, navegável por teclado (setas + enter + esc).
 * O filtro em si (options) é responsabilidade de quem usa o componente —
 * aqui só cuidamos de abrir/fechar o dropdown e da navegação.
 */
export function Autocomplete({
  value,
  onValueChange,
  options,
  onSelect,
  placeholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  className,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [options]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = options[activeIndex];
      if (chosen) {
        onSelect(chosen);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => value && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-8"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {value && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => {
              onValueChange("");
              setOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && value && (
        <div className="tf-panel absolute z-20 mt-1.5 w-full overflow-hidden p-1 shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-[var(--muted)]">{emptyMessage}</p>
          ) : (
            <ul role="listbox" className="max-h-72 overflow-y-auto">
              {options.map((opt, i) => (
                <li key={opt.id} role="option" aria-selected={i === activeIndex}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => {
                      onSelect(opt);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-[var(--radius)] px-3 py-2 text-left text-sm transition-colors",
                      i === activeIndex ? "bg-[var(--background)] text-[var(--primary)]" : "text-[var(--foreground)]"
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="truncate text-xs text-[var(--muted)]">{opt.sublabel}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
