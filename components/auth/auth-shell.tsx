import type { ReactNode } from "react";

import { FixyLogo } from "@/components/brand/fixy-logo";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden mesh-panel subtle-grid p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <FixyLogo className="text-white" />
        <div className="max-w-xl space-y-6">
          <div className="inline-flex rounded-full border border-white/14 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            Fixy para talleres y propietarios
          </div>
          <div className="space-y-4">
            <h1 className="font-[family-name:var(--font-heading)] text-5xl font-bold leading-tight tracking-tight">
              Control operativo para talleres. Claridad total para quienes cuidan su carro.
            </h1>
            <p className="max-w-lg text-base leading-7 text-white/72">
              Entra desde el telefono, agenda mas rapido, da seguimiento a reparaciones y evita el
              caos de mensajes sueltos, cuadernos y enlaces confusos.
            </p>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/12 bg-white/8 p-6 text-sm leading-6 text-white/76">
          Acceso movil primero, rutas claras y menos friccion para entrar, registrarse o recuperar
          la cuenta.
        </div>
      </section>

      <section className="flex min-h-screen items-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-md space-y-6">
          <FixyLogo />
          <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm leading-6 text-[var(--muted)] lg:hidden">
            Fixy conecta talleres y propietarios con un acceso simple, movil y claro desde el primer paso.
          </div>
          <div className="space-y-2">
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
              {title}
            </h2>
            <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
