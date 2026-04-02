import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: Route;
  icon: ReactNode;
};

export function EmptyStateCard({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateCardProps) {
  return (
    <Card className="bg-white/86">
      <CardHeader>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
