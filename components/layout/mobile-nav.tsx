"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { mobileNavigation } from "@/lib/navigation";

type MobileNavProps = {
  notificationCount?: number;
};

export function MobileNav({ notificationCount = 0 }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 rounded-[28px] border border-white/60 bg-white/92 p-2 shadow-[0_20px_50px_rgba(21,28,35,0.18)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-[20px] px-2 py-2 text-[11px] font-semibold",
                isActive
                  ? "bg-[var(--foreground)] text-white"
                  : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="size-4" />
              <span>{item.title}</span>
              {item.href === "/app/notifications" && notificationCount > 0 ? (
                <span className="absolute right-2 top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
