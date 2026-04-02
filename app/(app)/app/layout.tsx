import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { requireAppSession } from "@/lib/auth/session";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await requireAppSession();

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6">
        <AppTopbar
          userName={session.user.name}
          role={session.user.role}
          workshopName={session.user.workshopName}
        />
        <div className="pt-6">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}
