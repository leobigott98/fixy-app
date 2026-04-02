import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, Coins, ContactRound, Wrench } from "lucide-react";

import { DonutChartCard, BarChartCard, LineChartCard } from "@/components/dashboard/charts";
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
    variant: "primary" | "outline";
  }> = [
    {
      href: "/app/quotes/new" as Route,
      title: "Nuevo presupuesto",
      description: "Cotiza rapido y manda algo profesional.",
      icon: ClipboardList,
      variant: "primary",
    },
    {
      href: "/app/work-orders/new" as Route,
      title: "Nueva Orden",
      description: "Abre trabajo manualmente sin pasar por presupuesto.",
      icon: Wrench,
      variant: "primary",
    },
    {
      href: "/app/clients" as Route,
      title: "Clientes",
      description: "Revisa y crea fichas rapidamente.",
      icon: ContactRound,
      variant: "outline",
    },
    {
      href: "/app/finances/payments/new" as Route,
      title: "Registrar cobro",
      description: "Carga pagos sin salir del flujo operativo.",
      icon: Coins,
      variant: "outline",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dashboard de ${workshop.workshop_name}`}
        description={`Operacion del taller en ${workshop.city}. Horario: ${workshop.opening_hours_label}.`}
        status="BI operativo"
        action={{
          label: "Editar perfil",
          icon: <ArrowUpRight className="size-4" />,
          href: "/app/settings",
        }}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              asChild
              className="h-auto justify-start rounded-[24px] p-4 text-left"
              key={action.title}
              variant={action.variant}
            >
              <Link href={action.href}>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/82 text-[var(--primary-strong)]">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-sm leading-6 text-[var(--muted)]">{action.description}</div>
                </div>
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
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
          label="Cobrado este mes"
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
        <KpiCard
          helper="Promedio por orden completada."
          label="Ticket promedio"
          tone="primary"
          value={formatCurrencyDisplay(stats.averageTicket, workshop.preferred_currency)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <LineChartCard
          data={stats.analytics.cashflowTrend}
          description="Lectura mensual de caja: cuanto cobraste y cuanto salio del taller."
          title="Tendencia de caja"
        />

        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Taller</Badge>
            <CardTitle className="text-white">Resumen ejecutivo</CardTitle>
            <CardDescription className="text-white/72">
              Los datos base del taller y su capacidad se leen aqui de un vistazo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Encargado", workshop.owner_name],
              ["WhatsApp", workshop.whatsapp_phone],
              ["Tipo", workshop.workshop_type],
              ["Puestos", String(workshop.bay_count)],
              ["Ordenes completadas", String(stats.completedOrders)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl bg-white/8 p-4">
                <div className="text-sm text-white/64">{label}</div>
                <div className="mt-1 font-semibold">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DonutChartCard
          data={stats.analytics.workOrdersByStatus}
          description="Distribucion del trabajo real dentro del taller."
          title="Ordenes por etapa"
          totalLabel="Total ordenes"
        />
        <BarChartCard
          data={stats.analytics.quotesByStatus}
          description="Mide rapido cuanto tienes en borrador, enviado o aprobado."
          title="Embudo de presupuestos"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Ordenes recientes</CardTitle>
            <CardDescription>
              Lo ultimo que entro al taller y cuanto representa para la operacion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentOrders.length ? (
              stats.recentOrders.map((order) => (
                <div
                  className="flex flex-col gap-3 rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={order.id}
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
                actionHref={"/app/work-orders/new" as Route}
                actionLabel="Crear orden"
                description="Aun no hay ordenes registradas. Cuando lleguen, este bloque mostrara seguimiento rapido del taller."
                icon={<Wrench className="size-5" />}
                title="Todavia no hay ordenes"
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Lectura rapida del negocio</CardTitle>
            <CardDescription>
              Bloques pensados para que el dueño sepa donde actuar sin leer reportes pesados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              `Hay ${stats.pendingQuotes} presupuestos pendientes que todavia pueden convertirse en trabajo.`,
              `Tienes ${availableSpaces} puestos libres para absorber nuevas entradas hoy.`,
              `El ticket promedio va en ${formatCurrencyDisplay(stats.averageTicket, workshop.preferred_currency)} sobre ordenes completadas.`,
            ].map((item) => (
              <div
                className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]"
                key={item}
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
