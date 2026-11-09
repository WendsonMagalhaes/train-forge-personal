"use client";

import { Toaster, toast as sonner } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

type ToastVariant = "success" | "error" | "info";
type ToastInput = { title?: string; description: string; variant: ToastVariant };

/**
 * Wrapper sobre o sonner. Mantém a mesma API (`const { toast } = useToast()`)
 * usada em todo o projeto, então nenhum componente precisa mudar.
 * Se houver `title`, ele vira a mensagem principal e `description` fica abaixo.
 */
export function useToast() {
  return {
    toast: ({ variant, title, description }: ToastInput) => {
      const message = title ?? description;
      const options = title ? { description } : undefined;
      if (variant === "success") sonner.success(message, options);
      else if (variant === "error") sonner.error(message, options);
      else sonner.info(message, options);
    },
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        theme={theme}
        position="top-center"
        closeButton
        toastOptions={{
          style: {
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            borderRadius: "var(--radius)",
          },
        }}
      />
    </>
  );
}
