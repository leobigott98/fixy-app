import type { ReactNode } from "react";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { ProtectedAppShell } from "@/components/layout/protected-app-shell";
import { requireAppSession } from "@/lib/auth/session";
import { getCurrentCarOwnerProfile } from "@/lib/data/car-owners";
import { getWorkshopNotificationCount } from "@/lib/data/marketplace";
import { getCurrentWorkshopAccess } from "@/lib/data/workshops";
import { getRoleLabel, type AppRole } from "@/lib/permissions";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await requireAppSession();
  const access = await getCurrentWorkshopAccess();
  const ownerProfile = access ? null : await getCurrentCarOwnerProfile();
  const workshop = access?.workshop ?? null;
  const role = (access?.role ?? (session.user.accountType === "car_owner" || ownerProfile ? "car_owner" : "owner")) as AppRole;

  if (access && ["owner", "admin"].includes(access.role) && session.user.aal.currentLevel !== "aal2") {
    redirect("/mfa" as Route);
  }

  const roleLabel = access ? getRoleLabel(access.role) : getRoleLabel(role);
  const notificationCount = workshop ? await getWorkshopNotificationCount(workshop.id) : 0;

  return (
    <ProtectedAppShell
      notificationCount={notificationCount}
      role={role}
      roleLabel={roleLabel}
      workshopLogoUrl={workshop?.logo_url ?? ownerProfile?.avatarUrl ?? undefined}
      userName={access?.member?.full_name ?? workshop?.owner_name ?? ownerProfile?.fullName ?? session.user.name}
      workshopName={workshop?.workshop_name ?? (ownerProfile ? "Mi garage" : "Configura tu cuenta")}
    >
      {children}
    </ProtectedAppShell>
  );
}
