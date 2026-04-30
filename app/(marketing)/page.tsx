import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  MessageCircleMore,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { FixyLogo } from "@/components/brand/fixy-logo";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const actions = [
  {
    title: "Cotizar",
    description: "Presupuestos limpios para enviar por WhatsApp.",
    icon: ClipboardCheck,
    tone: "dark",
  },
  {
    title: "Ordenar taller",
    description: "Ordenes, responsables y avances visibles.",
    icon: Wrench,
    tone: "gold",
  },
  {
    title: "Atender carros",
    description: "Ficha, historial y citas desde el telefono.",
    icon: CarFront,
    tone: "light",
  },
  {
    title: "Cobrar mejor",
    description: "Pagos y pendientes sin hoja suelta.",
    icon: Coins,
    tone: "light",
  },
] as const;

const modules = [
  "Dashboard operativo",
  "Clientes y vehiculos",
  "Presupuestos",
  "Ordenes de trabajo",
  "Equipo y roles",
  "Calendario",
  "Inventario",
  "Finanzas base",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-7xl flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
        <header className="flex items-center justify-between gap-4">
          <FixyLogo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/talleres">Explorar talleres</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="primary" className="hidden sm:inline-flex">
              <Link href="/signup">Crear cuenta</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-8 pt-9 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pt-12">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">Workshop OS para Venezuela</Badge>
              <Badge>Mobile-first</Badge>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight sm:text-6xl">
                Tu taller, tus clientes y tus carros en una vista moderna.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Fixy ayuda a talleres y propietarios a manejar presupuestos, ordenes,
                citas, pagos, inventario e historial sin sentirse como software viejo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="primary" size="lg">
                <Link href="/signup">
                  Crear cuenta
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/talleres">Ver talleres</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {["Menos friccion", "Mejor seguimiento", "Listo para movil"].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-[var(--line)] bg-white/78 px-4 py-3 text-sm font-semibold"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon;
            const isDark = action.tone === "dark";
            const isGold = action.tone === "gold";

            return (
              <div
                key={action.title}
                className={[
                  "min-h-[174px] rounded-[22px] border p-5 shadow-[0_16px_34px_rgba(7,31,39,0.08)]",
                  isDark
                    ? "border-white/10 bg-[var(--surface-dark)] text-white"
                    : isGold
                      ? "fixy-gold-panel border-transparent"
                      : "border-[var(--line)] bg-white/84",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex size-12 items-center justify-center rounded-[16px]",
                    isDark || isGold
                      ? "bg-white/10 text-white"
                      : "bg-[rgba(201,138,5,0.1)] text-[var(--primary-strong)]",
                  ].join(" ")}
                >
                  <Icon className="size-5" />
                </div>
                <div className="mt-5 font-[family-name:var(--font-heading)] text-xl font-bold">
                  {action.title}
                </div>
                <p className={["mt-2 text-sm leading-6", isDark || isGold ? "text-white/78" : "text-[var(--muted)]"].join(" ")}>
                  {action.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-[22px] border border-[var(--line)] bg-white/82 p-6 shadow-[0_20px_44px_rgba(7,31,39,0.08)] lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
          <SectionTitle
            eyebrow="Marketplace"
            title="Conductores encuentran talleres. Talleres reciben solicitudes claras."
            description="La capa publica de Fixy esta hecha para discovery rapido: filtros simples, perfil visible, confianza base y salida directa a WhatsApp."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Busqueda por ciudad y servicio", Search],
              ["Perfil publico del taller", ShieldCheck],
              ["Solicitud ligera de atencion", CalendarClock],
              ["Contacto directo por WhatsApp", MessageCircleMore],
            ].map(([item, Icon]) => (
              <div
                key={item as string}
                className="flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[rgba(7,31,39,0.03)] px-4 py-4 text-sm font-semibold"
              >
                <Icon className="size-4 text-[var(--primary-strong)]" />
                {item as string}
              </div>
            ))}
            <Button asChild className="sm:col-span-2" variant="secondary">
              <Link href="/talleres">Ir al directorio</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:pb-16">
        <div className="grid gap-8 rounded-[22px] border border-[var(--line)] bg-white/82 p-6 shadow-[0_20px_44px_rgba(7,31,39,0.08)] lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <SectionTitle
            eyebrow="Operacion"
            title="La base que un taller necesita para trabajar mejor hoy."
            description="Fixy prioriza visibilidad, accion rapida y datos suficientes para operar sin inflar el producto."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <div
                key={module}
                className="flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[rgba(7,31,39,0.03)] px-4 py-4 text-sm font-semibold"
              >
                <CheckCircle2 className="size-4 text-[var(--success)]" />
                {module}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white p-3 shadow-[0_26px_70px_rgba(7,31,39,0.14)]">
      <div className="grid min-h-[560px] overflow-hidden rounded-[20px] bg-[#fbfaf7] lg:grid-cols-[190px_1fr]">
        <div className="hidden bg-[var(--surface-dark)] p-4 text-white lg:block">
          <FixyLogo compact className="text-white" />
          <div className="mt-8 space-y-2">
            {["Mi garage", "Mis carros", "Talleres", "Citas", "Servicios"].map((item, index) => (
              <div
                key={item}
                className={[
                  "rounded-[14px] px-3 py-3 text-sm font-semibold",
                  index === 0 ? "bg-white/10 text-[var(--primary)] shadow-[inset_3px_0_0_var(--primary)]" : "text-white/70",
                ].join(" ")}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Fixy › Mi garage</div>
            <div className="hidden min-w-[270px] items-center gap-2 rounded-[16px] bg-[var(--surface-dark)] px-4 py-3 text-sm text-white/72 sm:flex">
              <Search className="size-4 text-[var(--primary)]" />
              Buscar en mi garage...
            </div>
          </div>

          <div className="mesh-panel subtle-grid mt-5 rounded-[20px] p-5 text-white">
            <div className="flex flex-wrap gap-2">
              <Badge variant="dark">Movilidad al dia</Badge>
              <Badge variant="dark">Propietario de vehiculo</Badge>
            </div>
            <div className="mt-5 font-[family-name:var(--font-heading)] text-3xl font-bold">
              Garage de Gabriel
            </div>
            <p className="mt-2 text-sm leading-6 text-white/76">
              Carros, talleres, citas y trazabilidad de servicios en una sola vista.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Agregar carro", CarFront, "dark"],
              ["Buscar talleres", Search, "gold"],
              ["Pedir cita", CalendarClock, "light"],
              ["Registrar servicio", ClipboardCheck, "light"],
            ].map(([title, Icon, tone]) => (
              <div
                key={title as string}
                className={[
                  "min-h-[128px] rounded-[18px] border p-4",
                  tone === "dark"
                    ? "border-white/10 bg-[var(--surface-dark)] text-white"
                    : tone === "gold"
                      ? "fixy-gold-panel border-transparent"
                      : "border-[var(--line)] bg-white",
                ].join(" ")}
              >
                <Icon className="size-6" />
                <div className="mt-5 font-bold">{title as string}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              ["Mis carros", "1", "OK"],
              ["Citas", "3", "Clave"],
              ["Servicios", "0", "Base"],
              ["Talleres", "2", "OK"],
            ].map(([label, value, badge]) => (
              <Card key={label} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">{label}</div>
                    <Badge variant={badge === "OK" ? "success" : badge === "Clave" ? "primary" : "default"}>
                      {badge}
                    </Badge>
                  </div>
                  <div className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
