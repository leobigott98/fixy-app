import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--foreground)] px-4 py-3 text-white shadow-[0_18px_32px_rgba(21,28,35,0.18)] hover:-translate-y-0.5 hover:bg-[#1d2730]",
        primary:
          "bg-[var(--primary)] px-4 py-3 text-white shadow-[0_18px_32px_rgba(249,115,22,0.26)] hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]",
        secondary:
          "bg-[var(--secondary)] px-4 py-3 text-white shadow-[0_18px_32px_rgba(15,118,110,0.24)] hover:-translate-y-0.5 hover:bg-[#115f58]",
        outline:
          "border border-[var(--line)] bg-white/80 px-4 py-3 text-[var(--foreground)] hover:-translate-y-0.5 hover:bg-white",
        ghost: "px-3 py-2 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--foreground)]",
      },
      size: {
        default: "",
        sm: "rounded-xl px-3 py-2 text-sm",
        lg: "rounded-3xl px-5 py-3.5 text-base",
        icon: "size-10 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
