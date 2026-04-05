import type { ReactNode } from "react";

import { ProtectedAppShell } from "@/components/layout/protected-app-shell";
import { requireAppSession } from "@/lib/auth/session";
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

  return (
    <ProtectedAppShell
      role={roleLabel}
      workshopLogoUrl={workshop?.logo_url ?? undefined}
      userName={access?.member?.full_name ?? workshop?.owner_name ?? session.user.name}
      workshopName={workshop?.workshop_name}
    >
      {children}
    </ProtectedAppShell>
  );
}
