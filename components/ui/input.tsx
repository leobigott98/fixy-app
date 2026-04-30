import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[18px] border border-[var(--line)] bg-white/92 px-4 text-sm text-[var(--foreground)] shadow-sm placeholder:text-[var(--muted)] focus-visible:border-[rgba(201,138,5,0.35)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
