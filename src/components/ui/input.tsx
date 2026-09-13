import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none transition-colors placeholder:text-[var(--muted)] focus-visible:border-[var(--tf-ember)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
