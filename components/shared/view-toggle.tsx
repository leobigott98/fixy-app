import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ViewToggleProps = {
  options: Array<{
    href: Route;
    label: string;
    icon: ReactNode;
    active: boolean;
  }>;
};

export function ViewToggle({ options }: ViewToggleProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-[28px] border border-[var(--line)] bg-white/80 p-2 shadow-[0_18px_40px_rgba(21,28,35,0.06)]">
      {options.map((option) => (
        <Button asChild key={option.label} variant={option.active ? "primary" : "outline"}>
          <Link href={option.href}>
            {option.icon}
            {option.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
