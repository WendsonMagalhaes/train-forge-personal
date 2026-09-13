import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-[3px] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", {
  variants: {
    variant: {
      default: "bg-[var(--tf-ember)] text-[#17130f]",
      secondary: "bg-[var(--tf-brass)] text-[#17130f]",
      outline: "border border-[var(--border)] text-[var(--muted)]",
      success: "bg-emerald-600 text-white",
      warning: "bg-amber-500 text-[#17130f]",
      danger: "bg-red-600 text-white",
    },
  },
  defaultVariants: { variant: "outline" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
