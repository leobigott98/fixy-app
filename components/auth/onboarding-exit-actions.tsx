"use client";

import { ArrowLeftRight } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";

type OnboardingExitActionsProps = {
  className?: string;
};

export function OnboardingExitActions({ className }: OnboardingExitActionsProps) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <LogoutButton
          className="w-full justify-center sm:w-auto"
          label="Cerrar sesion"
          variant="outline"
        />
        <LogoutButton
          className="w-full justify-center sm:w-auto"
          label="Volver y cambiar tipo"
          redirectTo="/signup"
          variant="ghost"
        />
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
        <ArrowLeftRight className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
        <span>
          Si elegiste mal entre taller y propietario, vuelve al registro y crea el onboarding correcto.
        </span>
      </div>
    </div>
  );
}
