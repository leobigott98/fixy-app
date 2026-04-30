import Link from "next/link";
import { Bell, ChevronDown, Search } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { Button } from "@/components/ui/button";
import { hasModuleAccess, type AppRole } from "@/lib/permissions";

type AppTopbarProps = {
  userName: string;
  role: AppRole;
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
  const isCarOwner = role === "car_owner";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
        <Link className="text-[var(--foreground)] hover:text-[var(--primary-strong)]" href="/">
          Fixy
        </Link>
        <span className="text-[var(--muted)]">›</span>
        <span>{isCarOwner ? "Mi garage" : workshopName}</span>
      </div>

      <div className="flex items-center gap-2 sm:min-w-[440px] sm:justify-end">
        <div className="hidden flex-1 items-center gap-3 rounded-[16px] bg-[var(--surface-dark)] px-4 py-3 text-white shadow-[0_18px_36px_rgba(7,31,39,0.16)] sm:flex">
          <Search className="size-5 text-[var(--primary)]" />
          <span className="text-sm text-white/72">
            {isCarOwner ? "Buscar en mi garage..." : "Buscar en mi taller..."}
          </span>
        </div>
        {canOpenNotifications ? (
          <Button asChild className="relative bg-[var(--surface-dark)] text-[var(--primary)] hover:bg-[var(--surface-deep)]" variant="default" size="icon">
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
        <div className="flex items-center gap-2 rounded-[16px] bg-[var(--surface-dark)] p-1.5 text-white">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-sm font-bold">
            {workshopLogoUrl ? (
              <img alt={workshopName} className="size-full object-cover" src={workshopLogoUrl} />
            ) : (
              userName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
            )}
          </div>
          <div className="hidden min-w-0 pr-1 sm:block">
            <div className="max-w-28 truncate text-sm font-semibold">{userName}</div>
            <div className="text-xs text-white/56">{roleLabel}</div>
          </div>
          <ChevronDown className="hidden size-4 text-white/62 sm:block" />
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
