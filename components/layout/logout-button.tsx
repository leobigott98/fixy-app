"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { sessionCookieName } from "@/lib/auth/constants";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className="h-10 rounded-2xl px-3 text-[var(--muted)]"
      onClick={() => {
        document.cookie = `${sessionCookieName}=; path=/; max-age=0; SameSite=Lax`;
        router.push("/login");
      }}
    >
      <LogOut className="size-4" />
      Salir
    </Button>
  );
}
