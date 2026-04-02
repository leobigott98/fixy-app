import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyDataTableProps = {
  columns: string[];
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: Route;
  icon?: ReactNode;
};

export function EmptyDataTable({
  columns,
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyDataTableProps) {
  return (
    <Card className="bg-white/88">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
              <tr>
                {columns.map((column) => (
                  <th className="px-5 py-4 font-semibold" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="flex flex-col items-start gap-4 px-6 py-8">
          {icon ? <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">{icon}</div> : null}
          <div>
            <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">{title}</div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p>
          </div>
          {actionHref && actionLabel ? (
            <Button asChild variant="outline">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
