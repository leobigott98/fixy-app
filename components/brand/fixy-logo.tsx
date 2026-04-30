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
      <div className="flex size-12 items-center justify-center rounded-[18px] bg-[var(--surface-dark)] text-[var(--primary)] ring-1 ring-white/14 shadow-[0_16px_28px_rgba(7,31,39,0.16)]">
        <Wrench className="size-6" />
      </div>
      {!compact ? (
        <div className="space-y-1">
          <div className="font-[family-name:var(--font-heading)] text-2xl font-bold uppercase tracking-[0.08em]">
            FIXY
          </div>
          <div className="fixy-logo-subtitle text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
            Tu taller, tu solucion.
          </div>
        </div>
      ) : null}
    </div>
  );

  return <Link href={href}>{content}</Link>;
}
