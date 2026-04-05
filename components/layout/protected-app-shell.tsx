"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { AppRole } from "@/lib/permissions";

type ProtectedAppShellProps = {
  children: ReactNode;
  userName: string;
  role: AppRole;
  roleLabel: string;
  workshopName?: string;
  workshopLogoUrl?: string;
  notificationCount?: number;
};

export function ProtectedAppShell({
  children,
  userName,
  role,
  roleLabel,
  workshopName,
  workshopLogoUrl,
  notificationCount = 0,
}: ProtectedAppShellProps) {
  const pathname = usePathname();
  const isOnboardingRoute =
    pathname === "/app/onboarding" || pathname === "/app/owner/onboarding";

  if (isOnboardingRoute) {
    return (
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar
        notificationCount={notificationCount}
        role={role}
        workshopLogoUrl={workshopLogoUrl}
        workshopName={workshopName}
      />
      <div className="flex min-h-screen flex-1 flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
        <AppTopbar
          notificationCount={notificationCount}
          role={role}
          roleLabel={roleLabel}
          workshopLogoUrl={workshopLogoUrl}
          userName={userName}
          workshopName={workshopName ?? "Configura tu taller"}
        />
        <div className="pt-6">{children}</div>
      </div>
      <MobileNav notificationCount={notificationCount} role={role} />
    </div>
  );
}
