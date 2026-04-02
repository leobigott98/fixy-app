import type { ReactNode } from "react";

import { ProtectedAppShell } from "@/components/layout/protected-app-shell";
import { requireAppSession } from "@/lib/auth/session";
import { getCurrentWorkshop } from "@/lib/data/workshops";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await requireAppSession();
  const workshop = await getCurrentWorkshop();

  return (
    <ProtectedAppShell
      role={session.user.role}
      workshopLogoUrl={workshop?.logo_url ?? undefined}
      userName={workshop?.owner_name ?? session.user.name}
      workshopName={workshop?.workshop_name}
    >
      {children}
    </ProtectedAppShell>
  );
}
