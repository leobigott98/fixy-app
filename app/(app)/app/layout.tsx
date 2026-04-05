import type { ReactNode } from "react";

import { ProtectedAppShell } from "@/components/layout/protected-app-shell";
import { requireAppSession } from "@/lib/auth/session";
import { getWorkshopNotificationCount } from "@/lib/data/marketplace";
import { getCurrentWorkshopAccess } from "@/lib/data/workshops";
import { getRoleLabel } from "@/lib/permissions";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await requireAppSession();
  const access = await getCurrentWorkshopAccess();
  const workshop = access?.workshop ?? null;
  const roleLabel = access ? getRoleLabel(access.role) : session.user.role;
  const notificationCount = workshop ? await getWorkshopNotificationCount(workshop.id) : 0;

  return (
    <ProtectedAppShell
      notificationCount={notificationCount}
      role={roleLabel}
      workshopLogoUrl={workshop?.logo_url ?? undefined}
      userName={access?.member?.full_name ?? workshop?.owner_name ?? session.user.name}
      workshopName={workshop?.workshop_name}
    >
      {children}
    </ProtectedAppShell>
  );
}
