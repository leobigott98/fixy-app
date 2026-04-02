import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, Coins, ContactRound, Wrench } from "lucide-react";

import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

export default async function DashboardPage() {
  const workshop = await requireCurrentWorkshop();
  const stats = await getDashboardStats(workshop.id);
  const availableSpaces = Math.max(workshop.bay_count - stats.activeWorkOrders, 0);
  const quickActions: Array<{
    href: Route;
    title: string;
    description: string;
    icon: typeof ClipboardList;
  }> = [
    {
      href: "/app/quotes",
      title: "Nuevo presupuesto",
      description: "Prepara la ruta para cotizar mas rapido.",
      icon: ClipboardList,
    },
    {
      href: "/app/work-orders",
      title: "Nueva orden",
      description: "Visualiza la operacion y el flujo del taller.",
      icon: Wrench,
    },
    {
      href: "/app/clients",
      title: "Agregar cliente",
      description: "Deja lista la base para historial y vehiculos.",
      icon: ContactRound,
    },
    {
      href: "/app/finances",
      title: "Registrar cobro",
      description: "Conecta caja, pagos y entregas futuras.",
      icon: Coins,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dashboard de ${workshop.workshop_name}`}
        description={`Operacion base del taller en ${workshop.city}. Horario: ${workshop.opening_hours_label}.`}
        status="Operativo"
        action={{
          label: "Editar perfil",
          icon: <ArrowUpRight className="size-4" />,
          href: "/app/settings",
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          helper="Trabajos abiertos o listos para entrega."
          label="Ordenes activas"
          tone="primary"
          value={String(stats.activeWorkOrders)}
        />
        <KpiCard
          helper="Presupuestos por enviar o por aprobar."
          label="Presupuestos pendientes"
          tone="primary"
          value={String(stats.pendingQuotes)}
        />
        <KpiCard
          helper={`Cobrado este periodo en ${workshop.preferred_currency}.`}
          label="Cobrado este periodo"
          tone="success"
          value={formatCurrencyDisplay(stats.collectedThisPeriod, workshop.preferred_currency)}
        />
        <KpiCard
          helper="Servicios que aun requieren avance del equipo."
          label="Servicios pendientes"
          value={String(stats.pendingServices)}
        />
        <KpiCard
          helper="Capacidad operativa libre en este momento."
          label="Puestos disponibles"
          tone="success"
          value={String(availableSpaces)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Acciones rapidas</CardTitle>
            <CardDescription>
              Base pensada para responder rapido desde el telefono o desde recepcion.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Button
                  key={action.title}
                  asChild
                  className="h-auto justify-start rounded-[24px] border border-[var(--line)] bg-[rgba(249,115,22,0.05)] p-4 text-left text-[var(--foreground)] shadow-none hover:bg-[rgba(249,115,22,0.09)]"
                  variant="outline"
                >
                  <Link href={action.href}>
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-[var(--primary-strong)]">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold">{action.title}</div>
                      <p className="text-sm leading-6 text-[var(--muted)]">{action.description}</p>
                    </div>
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Taller</Badge>
            <CardTitle className="text-white">Resumen operativo</CardTitle>
            <CardDescription className="text-white/72">
              Datos base del taller conectados al dashboard desde onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Encargado", workshop.owner_name],
              ["WhatsApp", workshop.whatsapp_phone],
              ["Tipo", workshop.workshop_type],
              ["Horario", workshop.opening_hours_label],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl bg-white/8 p-4">
                <div className="text-sm text-white/64">{label}</div>
                <div className="mt-1 font-semibold">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Ordenes recientes</CardTitle>
            <CardDescription>
              Las ultimas ordenes aparecen aqui en cuanto el modulo de ordenes empiece a operar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentOrders.length ? (
              stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-3 rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-semibold">{order.title}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {(order.vehicleLabel || "Vehiculo pendiente") + " - " + order.status}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--muted)]">
                    {(order.promisedDate || "Sin fecha") +
                      " - " +
                      formatCurrencyDisplay(order.totalAmount, workshop.preferred_currency)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyStateCard
                actionHref="/app/work-orders"
                actionLabel="Ir a ordenes"
                description="Aun no hay ordenes registradas. Cuando lleguen, este bloque mostrara seguimiento rapido del taller."
                icon={<Wrench className="size-5" />}
                title="Todavia no hay ordenes"
              />
            )}
          </CardContent>
        </Card>

        <EmptyStateCard
          actionHref="/app/quotes"
          actionLabel="Preparar modulo de presupuestos"
          description="El dashboard ya reserva espacio para el flujo clave de quote-to-approval, pero aun no hay datos cargados."
          icon={<ClipboardList className="size-5" />}
          title="Presupuestos y servicios listos para la siguiente capa"
        />
      </div>
    </div>
  );
}
