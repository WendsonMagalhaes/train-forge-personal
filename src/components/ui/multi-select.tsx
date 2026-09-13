"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSelect({
  name,
  options,
  defaultValue = [],
  placeholder = "Selecione uma ou mais opções",
}: {
  name: string;
  options: { label: string; value: string }[];
  defaultValue?: string[];
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(value: string) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const selectedLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  return (
    <div ref={ref} className="relative">
      {/* inputs escondidos com o mesmo `name` — FormData.getAll(name) captura todos */}
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm outline-none focus-visible:border-[var(--tf-ember)]"
      >
        <span className={cn("truncate", selectedLabels.length === 0 && "text-[var(--muted)]")}>
          {selectedLabels.length === 0 ? placeholder : selectedLabels.join(", ")}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
          {options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[3px] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--background)]",
                  active && "text-[var(--primary)]"
                )}
              >
                {opt.label}
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}

      {selectedLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {options
            .filter((o) => selected.includes(o.value))
            .map((o) => (
              <span
                key={o.value}
                className="flex items-center gap-1 rounded-[3px] bg-[var(--background)] px-2 py-0.5 text-xs"
              >
                {o.label}
                <button type="button" onClick={() => toggle(o.value)} className="text-[var(--muted)] transition-colors hover:text-red-500">
                  ×
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
