import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

type PublicShellProps = {
  badge: string;
  title: string;
  subtitle: string;
  workshop: {
    name: string;
    city: string;
    phone: string;
    logoUrl?: string | null;
  };
  actions?: ReactNode;
  children: ReactNode;
};

export function PublicShell({
  badge,
  title,
  subtitle,
  workshop,
  actions,
  children,
}: PublicShellProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fff 34%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="overflow-hidden rounded-[32px] border border-[var(--line)] bg-white shadow-[0_28px_80px_rgba(21,28,35,0.1)]">
          <div className="grid gap-6 border-b border-[var(--line)] bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(15,118,110,0.06))] px-6 py-7 sm:px-8 md:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <Badge variant="primary">{badge}</Badge>
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-white/84 p-5">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-[22px] border border-[var(--line)] bg-white">
                  {workshop.logoUrl ? (
                    <img
                      alt={`Logo de ${workshop.name}`}
                      className="size-full object-cover"
                      src={workshop.logoUrl}
                    />
                  ) : (
                    <div className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight text-[var(--foreground)]">
                      {workshop.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                    {workshop.name}
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {workshop.city} · {workshop.phone}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
            {actions ? <div className="flex flex-col gap-3 sm:flex-row">{actions}</div> : null}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
