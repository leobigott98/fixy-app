import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  description: string;
  status?: string;
  action?: {
    label: string;
    icon?: ReactNode;
  };
};

export function PageHeader({ title, description, status, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--line)] bg-white/72 p-5 shadow-[0_18px_40px_rgba(21,28,35,0.07)] sm:p-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-3">
        {status ? <Badge variant="primary">{status}</Badge> : null}
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
            {description}
          </p>
        </div>
      </div>
      {action ? (
        <Button variant="primary" className="w-full sm:w-auto">
          {action.icon}
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
