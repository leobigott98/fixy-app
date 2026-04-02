import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  MessageCircleMore,
  TimerReset,
  Wrench,
} from "lucide-react";

import { FixyLogo } from "@/components/brand/fixy-logo";
import { SectionTitle } from "@/components/shared/section-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Cotiza mas rapido",
    description: "Presupuestos claros, listos para enviar por WhatsApp y convertir en trabajo real.",
    icon: ClipboardCheck,
  },
  {
    title: "Sigue el trabajo visualmente",
    description: "Ordenes activas, responsables y estatus visibles sin depender de memoria.",
    icon: Wrench,
  },
  {
    title: "Cobra con claridad",
    description: "Pagos, pendientes y entregas alineados para que el taller opere mejor.",
    icon: TimerReset,
  },
];

const modules = [
  "Dashboard operativo",
  "Clientes y vehiculos",
  "Presupuestos",
  "Ordenes de trabajo",
  "Equipo",
  "Calendario",
  "Inventario",
  "Finanzas base",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-7xl flex-col px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8">
        <header className="flex items-center justify-between">
          <FixyLogo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild variant="primary">
              <Link href="/signup">Crear cuenta</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-8 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-16">
          <div className="space-y-6">
            <Badge variant="primary">Workshop OS para talleres en Venezuela</Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-[family-name:var(--font-heading)] text-5xl font-bold tracking-tight sm:text-6xl">
                El sistema del taller no debe sentirse como un ERP viejo.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Fixy ayuda a cotizar, organizar, cobrar y entregar mejor con una experiencia
                movil-first, visual y pensada para el ritmo real del taller.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="primary" size="lg">
                <Link href="/signup">
                  Empezar Sprint 0
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Entrar a la demo</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Presupuestos mas rapidos",
                "Ordenes con mejor visibilidad",
                "Mejor comunicacion con clientes",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-3 text-sm font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="glass-card overflow-hidden rounded-[32px] border p-4 sm:p-5">
              <div className="mesh-panel subtle-grid rounded-[28px] p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-white/60">
                      Hoy en el taller
                    </div>
                    <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold">
                      8 ordenes activas
                    </div>
                  </div>
                  <Badge variant="dark">Mobile first</Badge>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["Toyota Corolla", "Diagnostico completado", "Listo para presupuesto"],
                    ["Ford Fiesta", "Esperando repuesto", "Avisar por WhatsApp"],
                    ["Chevrolet Aveo", "Pago parcial recibido", "Entrega hoy"],
                  ].map(([vehicle, status, action]) => (
                    <div key={vehicle} className="rounded-3xl border border-white/12 bg-white/8 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold">{vehicle}</div>
                          <div className="mt-1 text-sm text-white/70">{status}</div>
                        </div>
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-white/88" />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-white/76">
                        <MessageCircleMore className="size-3.5" />
                        {action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Card className="bg-white/88">
                  <CardContent className="space-y-2 px-5 py-5">
                    <div className="text-sm text-[var(--muted)]">Presupuestos pendientes</div>
                    <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                      4
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/88">
                  <CardContent className="space-y-2 px-5 py-5">
                    <div className="text-sm text-[var(--muted)]">Cobros por validar</div>
                    <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                      USD 540
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Base de producto"
          title="Un sistema operativo para el taller, no otra oficina burocratica"
          description="La experiencia se construyo para menos clics, acciones mas visibles y mejor ritmo operativo desde el telefono."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <Card key={pillar.title} className="bg-white/82">
                <CardHeader className="space-y-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle>{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-[var(--muted)]">{pillar.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-[36px] border border-[var(--line)] bg-white/76 p-6 shadow-[0_20px_60px_rgba(21,28,35,0.08)] lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <SectionTitle
            eyebrow="Sprint 0"
            title="Rutas y modulos base listos para crecer"
            description="El foundation ya deja el espacio correcto para dashboard, clientes, vehiculos, presupuestos, ordenes, finanzas e inventario."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <div
                key={module}
                className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.03)] px-4 py-4 text-sm font-medium"
              >
                <CarFront className="size-4 text-[var(--primary-strong)]" />
                {module}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
