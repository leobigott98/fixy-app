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
  workshopName?: string;
  workshopLogoUrl?: string;
  notificationCount?: number;
};

export function AppSidebar({
  role,
  workshopName,
  workshopLogoUrl,
  notificationCount = 0,
}: AppSidebarProps) {
  const pathname = usePathname();
  const navigation = getPrimaryNavigation(role);
  const isCarOwner = role === "car_owner";
  return (
    <aside className="fixy-shell hidden w-[280px] shrink-0 border-r border-[var(--line)] px-5 py-6 lg:flex lg:flex-col">
      <FixyLogo />

      <div className="mt-8 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
                isActive
                  ? "bg-[var(--foreground)] text-white shadow-[0_18px_32px_rgba(21,28,35,0.18)]"
                  : "text-[var(--muted)] hover:bg-white/88 hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="size-4" />
              <span>{item.title}</span>
              {item.href === "/app/notifications" && notificationCount > 0 ? (
                <span
                  className={cn(
                    "ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                    isActive
                      ? "bg-white/16 text-white"
                      : "bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]",
                  )}
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto rounded-[28px] bg-[var(--surface-dark)] p-5 text-white">
        <Badge variant="dark">{isCarOwner ? "Cuenta activa" : "Taller activo"}</Badge>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-[20px] bg-white/10">
            {workshopLogoUrl ? (
              <img
                alt={workshopName || "Logo del taller"}
                className="size-full object-cover"
                src={workshopLogoUrl}
              />
            ) : (
              <div className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight text-white">
                {workshopName?.slice(0, 1) || "F"}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-tight">
              {workshopName || (isCarOwner ? "Mi garage" : "Configura tu taller")}
            </div>
            <p className="text-sm leading-6 text-white/70">
              {isCarOwner
                ? "Perfil, carros, citas e historial listos desde el telefono."
                : "Shell operativa lista para dashboard, presupuestos, ordenes y seguimiento visual."}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
