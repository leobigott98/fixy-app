import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, Bell, ClipboardList, Coins, ContactRound, Wrench } from "lucide-react";

import { DonutChartCard, BarChartCard, LineChartCard } from "@/components/dashboard/charts";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkshopNotificationCount } from "@/lib/data/marketplace";
import {
  getCurrentWorkshopAccess,
  getDashboardStats,
  getFinanceDashboardData,
  getMechanicDashboardData,
  getReceptionDashboardData,
  getTeamLeadDashboardData,
  requireCurrentWorkshop,
} from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

export default async function DashboardPage() {
  const workshop = await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const role = access?.role ?? "owner";

  if (role === "mechanic") {
    return access?.member?.mechanic_id ? (
      <MechanicDashboard
        currency={workshop.preferred_currency}
        data={await getMechanicDashboardData(workshop.id, access.member.mechanic_id)}
        workshopName={workshop.workshop_name}
      />
    ) : (
      <div className="space-y-6">
        <PageHeader
          title={`Dashboard de ${workshop.workshop_name}`}
          description="Tu acceso ya esta activo, pero falta vincular tu perfil operativo con una ficha del equipo."
          status="Mecanico"
        />
        <PermissionBanner
          title="Perfil pendiente"
          description="Pidele al propietario que vincule tu acceso con un integrante del modulo Equipo para ver agenda, carros asignados y comisiones."
          tone="warning"
        />
      </div>
    );
  }

  if (role === "jefe_taller") {
    return (
      <TeamLeadDashboard
        data={await getTeamLeadDashboardData(workshop.id)}
        workshopName={workshop.workshop_name}
      />
    );
  }

  if (role === "recepcion") {
    return (
      <ReceptionDashboard
        data={await getReceptionDashboardData(workshop.id)}
        workshopName={workshop.workshop_name}
      />
    );
  }

  if (role === "finanzas") {
    return (
      <FinanceDashboard
        currency={workshop.preferred_currency}
        data={await getFinanceDashboardData(workshop.id)}
        workshopName={workshop.workshop_name}
      />
    );
  }

  const stats = await getDashboardStats(workshop.id);
  const notificationCount = await getWorkshopNotificationCount(workshop.id);
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

      <Card className="bg-white/86">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Solicitudes nuevas</CardTitle>
              <CardDescription>
                Leads que llegaron desde el directorio publico y necesitan respuesta.
              </CardDescription>
            </div>
            <Badge variant={notificationCount > 0 ? "primary" : "success"}>
              {notificationCount > 0 ? `${notificationCount} nuevas` : "Al dia"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
              <Bell className="size-5" />
            </div>
            <div>
              <div className="font-medium">
                {notificationCount > 0
                  ? `Tienes ${notificationCount} solicitud${notificationCount === 1 ? "" : "es"} pendiente${notificationCount === 1 ? "" : "s"}`
                  : "No hay solicitudes pendientes ahora mismo"}
              </div>
              <div className="text-sm text-[var(--muted)]">
                Las consultas del marketplace ya aparecen dentro del taller con acceso directo a llamada y WhatsApp.
              </div>
            </div>
          </div>
          <Button asChild variant="primary">
            <Link href={"/app/notifications" as Route}>Abrir solicitudes</Link>
          </Button>
        </CardContent>
      </Card>

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

function MechanicDashboard({
  workshopName,
  currency,
  data,
}: {
  workshopName: string;
  currency: "USD" | "VES" | "USD_VES";
  data: Awaited<ReturnType<typeof getMechanicDashboardData>>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Mi trabajo en ${workshopName}`}
        description="Tus carros, tu agenda y tus comisiones en una sola vista ligera."
        status="Mecanico"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ordenes activas" value={String(data.activeOrders)} helper="Carros que tienes en curso." tone="primary" />
        <KpiCard label="Agenda proxima" value={String(data.upcomingAppointments)} helper="Citas o ingresos asignados." />
        <KpiCard label="Comision pendiente" value={formatCurrencyDisplay(data.pendingCommissionAmount, currency)} helper="Por calcular o pagar." tone="primary" />
        <KpiCard label="Comision pagada" value={formatCurrencyDisplay(data.paidCommissionAmount, currency)} helper="Ya liquidada." tone="success" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Carros asignados</CardTitle>
            <CardDescription>Lo que tienes en mano ahora mismo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.assignedWorkOrders.length ? (
              data.assignedWorkOrders.map((order) => (
                <div key={order.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                  <div className="font-semibold">{order.title}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    {(order.vehicleLabel || "Vehiculo pendiente") + " · " + order.status}
                  </div>
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    {order.promisedDate || "Sin fecha compromiso"}
                  </div>
                </div>
              ))
            ) : (
              <EmptyRoleState text="Todavia no tienes ordenes asignadas." />
            )}
          </CardContent>
        </Card>
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Mi agenda</CardTitle>
            <CardDescription>Lectura rapida de tu siguiente carga.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.appointments.length ? (
              data.appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{appointment.date}</div>
                    <Badge>{appointment.time}</Badge>
                  </div>
                  <div className="mt-2 text-sm">{appointment.clientName || "Cliente pendiente"}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {appointment.vehicleLabel || "Vehiculo pendiente"}
                  </div>
                </div>
              ))
            ) : (
              <EmptyRoleState text="No tienes citas asignadas por ahora." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeamLeadDashboard({
  workshopName,
  data,
}: {
  workshopName: string;
  data: Awaited<ReturnType<typeof getTeamLeadDashboardData>>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Coordinacion de ${workshopName}`}
        description="Carga del equipo, huecos de asignacion y ritmo del dia."
        status="Jefe de taller"
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Ordenes sin asignar" value={String(data.unassignedOrders)} helper="Trabajo que aun no tiene responsable." tone="primary" />
        <KpiCard label="Integrantes activos" value={String(data.activeMechanics)} helper="Equipo disponible hoy." />
        <KpiCard label="Citas de hoy" value={String(data.todayAppointments)} helper="Entradas que afectan la carga." tone="success" />
      </div>
      <Card className="bg-white/86">
        <CardHeader>
          <CardTitle>Carga por integrante</CardTitle>
          <CardDescription>Te ayuda a repartir trabajo sin abrir varias pantallas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          {data.mechanics.length ? (
            data.mechanics.map((mechanic) => (
              <div key={mechanic.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                <div className="font-semibold">{mechanic.fullName}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="primary">{mechanic.activeOrders} activas</Badge>
                  <Badge variant="success">{mechanic.completedOrders} completadas</Badge>
                </div>
              </div>
            ))
          ) : (
            <EmptyRoleState text="Aun no hay equipo operativo cargado." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReceptionDashboard({
  workshopName,
  data,
}: {
  workshopName: string;
  data: Awaited<ReturnType<typeof getReceptionDashboardData>>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Frente de ${workshopName}`}
        description="Lo que recepcion necesita para responder, ordenar y entregar."
        status="Recepcion"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Solicitudes nuevas" value={String(data.newLeads)} helper="Marketplace y consultas por atender." tone="primary" />
        <KpiCard label="Presupuestos pendientes" value={String(data.pendingQuotes)} helper="Por enviar o seguir." />
        <KpiCard label="Listas para entrega" value={String(data.readyDeliveries)} helper="Vehiculos por coordinar con cliente." tone="success" />
        <KpiCard label="Agenda de hoy" value={String(data.todayAppointments)} helper="Ingresos y visitas programadas." />
      </div>
      <PermissionBanner
        title="Vista de recepcion"
        description="Tu menu prioriza clientes, presupuestos, ordenes, reviews, calendario y solicitudes para mantener la cara del taller bien atendida."
      />
    </div>
  );
}

function FinanceDashboard({
  workshopName,
  currency,
  data,
}: {
  workshopName: string;
  currency: "USD" | "VES" | "USD_VES";
  data: Awaited<ReturnType<typeof getFinanceDashboardData>>;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Control financiero de ${workshopName}`}
        description="Caja, egresos y pendiente por cobrar en lectura ejecutiva."
        status="Finanzas"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Cobrado este mes" value={formatCurrencyDisplay(data.collectedThisMonth, currency)} helper="Entradas confirmadas." tone="success" />
        <KpiCard label="Gastos del mes" value={formatCurrencyDisplay(data.expensesThisMonth, currency)} helper="Salidas registradas." />
        <KpiCard label="Pendiente por cobrar" value={formatCurrencyDisplay(data.pendingBalances, currency)} helper="Ordenes aun abiertas." tone="primary" />
        <KpiCard label="Neto del mes" value={formatCurrencyDisplay(data.netThisMonth, currency)} helper="Cobrado menos gastos." tone={data.netThisMonth >= 0 ? "success" : "default"} />
      </div>
      <PermissionBanner
        title="Vista de finanzas"
        description="Tu acceso incluye cobranzas, reportes, inventario, compras y operacion cliente para cerrar el circuito de dinero."
      />
    </div>
  );
}

function EmptyRoleState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
      {text}
    </div>
  );
}
