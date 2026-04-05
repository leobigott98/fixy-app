import Link from "next/link";
import { Bell, Search } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasModuleAccess, type WorkshopRole } from "@/lib/permissions";

type AppTopbarProps = {
  userName: string;
  role: WorkshopRole;
  roleLabel: string;
  workshopName: string;
  workshopLogoUrl?: string;
  notificationCount?: number;
};

export function AppTopbar({
  userName,
  role,
  roleLabel,
  workshopName,
  workshopLogoUrl,
  notificationCount = 0,
}: AppTopbarProps) {
  const canOpenNotifications = hasModuleAccess(role, "notifications");

  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-[var(--line)] bg-white/72 p-4 shadow-[0_18px_40px_rgba(21,28,35,0.07)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Taller en marcha</Badge>
          <Badge>{roleLabel}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
            {workshopLogoUrl ? (
              <img
                alt={workshopName}
                className="size-full object-cover"
                src={workshopLogoUrl}
              />
            ) : (
              <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                {workshopName.slice(0, 1)}
              </span>
            )}
          </div>
          <div>
            <div className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
              {workshopName}
            </div>
            <div className="text-sm text-[var(--muted)]">
              Hola, {userName}. Base lista para operar desde movil y escritorio.
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Buscar">
          <Search className="size-4" />
        </Button>
        {canOpenNotifications ? (
          <Button asChild className="relative" variant="outline" size="icon">
            <Link aria-label="Notificaciones" href="/app/notifications">
              <Bell className="size-4" />
              {notificationCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Link>
          </Button>
        ) : null}
        <LogoutButton />
      </div>
    </div>
  );
}
