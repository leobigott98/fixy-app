"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FixyLogo } from "@/components/brand/fixy-logo";
import { Badge } from "@/components/ui/badge";
import { getPrimaryNavigation } from "@/lib/navigation";
import type { AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  role: AppRole;
  roleLabel: string;
  userName: string;
  workshopName?: string;
  workshopLogoUrl?: string;
  notificationCount?: number;
};

export function AppSidebar({
  role,
  roleLabel,
  userName,
  workshopName,
  workshopLogoUrl,
  notificationCount = 0,
}: AppSidebarProps) {
  const pathname = usePathname();
  const navigation = getPrimaryNavigation(role);
  const isCarOwner = role === "car_owner";
  return (
    <aside className="fixy-shell hidden w-[292px] shrink-0 border-r border-white/10 px-5 py-6 lg:flex lg:flex-col">
      <FixyLogo className="text-white [&_.fixy-logo-subtitle]:text-white/62" />

      <div className="mt-8 grid grid-cols-2 gap-1 rounded-[14px] border border-white/18 bg-white/5 p-1">
        <div
          className={cn(
            "rounded-[10px] px-3 py-2 text-center text-sm font-bold",
            isCarOwner ? "bg-[var(--primary)] text-white" : "text-white/68",
          )}
        >
          Mi garage
        </div>
        <div
          className={cn(
            "rounded-[10px] px-3 py-2 text-center text-sm font-bold",
            !isCarOwner ? "bg-[var(--primary)] text-white" : "text-white/68",
          )}
        >
          Taller
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-[16px] px-4 py-3 text-sm font-semibold",
                isActive
                  ? "bg-white/10 text-[var(--primary)] shadow-[inset_4px_0_0_var(--primary)]"
                  : "text-white/78 hover:bg-white/7 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              <span>{item.title}</span>
              {item.href === "/app/notifications" && notificationCount > 0 ? (
                <span
                  className={cn(
                    "ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                    isActive
                      ? "bg-[var(--primary)] text-white"
                      : "bg-white/12 text-white",
                  )}
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto border-t border-white/10 pt-5 text-white">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)] text-white">
            {workshopLogoUrl ? (
              <img
                alt={workshopName || "Logo del taller"}
                className="size-full object-cover"
                src={workshopLogoUrl}
              />
            ) : (
              <div className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-white">
                {(userName || workshopName || "F").slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {userName || workshopName || (isCarOwner ? "Mi garage" : "Configura tu taller")}
            </div>
            <div className="text-xs text-white/62">{roleLabel}</div>
          </div>
          <span className="text-xl text-white/54">›</span>
        </div>
      </div>
    </aside>
  );
}
