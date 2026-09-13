"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";
type ToastItem = { id: string; title?: string; description: string; variant: ToastVariant };
type ToastInput = Omit<ToastItem, "id">;

const ToastContext = createContext<{ toast: (t: ToastInput) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = Math.random().toString(36).slice(2);
      setItems((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end">
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const COLORS = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-[var(--tf-brass)]",
};

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = ICONS[item.variant];

  return (
    <div className="tf-panel flex w-full max-w-sm items-start gap-3 p-3 shadow-lg">
      <Icon className={cn("h-5 w-5 shrink-0", COLORS[item.variant])} />
      <div className="min-w-0 flex-1">
        {item.title && <p className="text-sm font-medium">{item.title}</p>}
        <p className="text-xs text-[var(--muted)]">{item.description}</p>
      </div>
      <button onClick={onClose} className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Fechar">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
