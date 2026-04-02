import type { Route } from "next";
import Link from "next/link";
import { Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

type FixyLogoProps = {
  href?: Route;
  className?: string;
  compact?: boolean;
};

export function FixyLogo({ href = "/", className, compact = false }: FixyLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--foreground)] text-white shadow-[0_16px_28px_rgba(21,28,35,0.18)]">
        <Wrench className="size-5" />
      </div>
      {!compact ? (
        <div className="space-y-0.5">
          <div className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
            Fixy
          </div>
          <div className="text-xs text-[var(--muted)]">Workshop Operating System</div>
        </div>
      ) : null}
    </div>
  );

  return <Link href={href}>{content}</Link>;
}
