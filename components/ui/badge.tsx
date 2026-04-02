import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-black/6 text-[var(--foreground)]",
        primary: "bg-[rgba(249,115,22,0.14)] text-[var(--primary-strong)]",
        success: "bg-[rgba(21,128,61,0.14)] text-[var(--success)]",
        dark: "bg-white/10 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
