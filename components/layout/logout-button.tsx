"use client";

import type { Route } from "next";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ButtonProps } from "@/components/ui/button";

type LogoutButtonProps = {
  redirectTo?: string;
  label?: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
};

export function LogoutButton({
  redirectTo = "/login",
  label = "Salir",
  className,
  variant = "ghost",
  size,
}: LogoutButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("h-10 rounded-2xl px-3 text-[var(--muted)]", className)}
      onClick={async () => {
        await supabase.auth.signOut();
        router.push(redirectTo as Route);
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
      {label}
    </Button>
  );
}
