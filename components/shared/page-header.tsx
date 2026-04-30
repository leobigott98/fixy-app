import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Home } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  description: string;
  status?: string;
  action?: {
    label: string;
    icon?: ReactNode;
    href?: Route;
  };
};

export function PageHeader({ title, description, status, action }: PageHeaderProps) {
  return (
    <div className="mesh-panel subtle-grid flex flex-col gap-5 rounded-[22px] border border-white/10 p-5 text-white shadow-[0_22px_46px_rgba(7,31,39,0.16)] sm:p-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-4">
        <div className="hidden size-[74px] shrink-0 items-center justify-center rounded-[28px] bg-white/8 text-[var(--primary)] ring-1 ring-white/10 sm:flex">
          <Home className="size-8" />
        </div>
        <div className="space-y-3">
        {status ? <Badge variant="dark">{status}</Badge> : null}
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-white/78 sm:text-base">
            {description}
          </p>
        </div>
        </div>
      </div>
      {action ? (
        action.href ? (
          <Button asChild variant="primary" className="w-full sm:w-auto">
            <Link href={action.href}>
              {action.icon}
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button variant="primary" className="w-full sm:w-auto">
            {action.icon}
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
