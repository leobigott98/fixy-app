import type { Route } from "next";
import Link from "next/link";
import { CalendarClock, CarFront, ClipboardList, Search, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCarOwnerDashboardData } from "@/lib/data/car-owners";
import { formatCurrencyDisplay } from "@/lib/utils";

export default async function OwnerGaragePage() {
  const dashboard = await getCarOwnerDashboardData();

  const quickActions: Array<{
    href: Route;
    label: string;
    description: string;
    icon: typeof CarFront;
    variant: "primary" | "outline";
  }> = [
    {
      href: "/app/my-cars/new" as Route,
      label: "Agregar carro",
      description: "Carga fotos, datos y deja lista la ficha.",
      icon: CarFront,
      variant: "primary",
    },
    {
      href: "/app/workshops" as Route,
      label: "Buscar talleres",
      description: "Descubre opciones reales sin friccion.",
      icon: Search,
      variant: "primary",
    },
    {
      href: "/app/appointments/new" as Route,
      label: "Pedir cita",
      description: "Solicita atencion con tu carro ya seleccionado.",
      icon: CalendarClock,
      variant: "outline",
    },
    {
      href: "/app/history/new" as Route,
      label: "Registrar servicio",
      description: "Guarda mantenimiento o reparaciones.",
      icon: ClipboardList,
      variant: "outline",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Garage de ${dashboard.profile.fullName}`}
        description="Tu vista movil para carros, talleres, citas y trazabilidad de servicios en un solo lugar."
        status="Mi Fixy"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;

          return (
            <Button
              asChild
              className="h-auto justify-start rounded-[24px] p-4 text-left"
              key={action.label}
              variant={action.variant}
            >
              <Link href={action.href}>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/82 text-[var(--primary-strong)]">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold">{action.label}</div>
                  <div className="text-sm leading-6 text-[var(--muted)]">{action.description}</div>
                </div>
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Mis carros" value={String(dashboard.stats.vehicles)} helper="Vehiculos activos en tu cuenta." />
        <MetricCard label="Citas" value={String(dashboard.stats.appointments)} helper="Solicitudes abiertas o confirmadas." tone="primary" />
        <MetricCard label="Servicios" value={String(dashboard.stats.services)} helper="Registros que ya forman tu historial." />
        <MetricCard label="Talleres visibles" value={String(dashboard.stats.workshops)} helper="Directorio publico disponible ahora." tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-white/88">
          <CardHeader>
            <CardTitle>Mis carros</CardTitle>
            <CardDescription>Fichas listas para pedir cita y guardar servicios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.vehicles.length ? (
              dashboard.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{vehicle.label}</div>
                      <div className="text-sm text-[var(--muted)]">
                        {[vehicle.color, vehicle.plate].filter(Boolean).join(" · ") || "Ficha basica lista"}
                      </div>
                    </div>
                    {vehicle.photoUrls[0] ? (
                      <img alt={vehicle.label} className="size-16 rounded-2xl object-cover" src={vehicle.photoUrls[0]} />
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <EmptyBlock
                actionHref="/app/my-cars/new"
                actionLabel="Agregar primer carro"
                description="Empieza por cargar tu carro principal para poder pedir cita y guardar historial."
                title="Aun no has cargado carros"
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/88">
          <CardHeader>
            <CardTitle>Proximas citas</CardTitle>
            <CardDescription>Solicitudes que aun requieren atencion o confirmacion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.upcomingAppointments.length ? (
              dashboard.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{appointment.workshop.name}</div>
                    <Badge variant={appointment.status === "confirmada" ? "success" : "primary"}>
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {[appointment.requestedDate, appointment.requestedTime, appointment.vehicle?.label]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{appointment.issueSummary}</div>
                </div>
              ))
            ) : (
              <EmptyBlock
                actionHref="/app/appointments/new"
                actionLabel="Pedir una cita"
                description="Cuando envies una solicitud, aqui quedara visible su estado."
                title="No tienes citas abiertas"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-white/88">
          <CardHeader>
            <CardTitle>Historial reciente</CardTitle>
            <CardDescription>Lo ultimo que se hizo sobre alguno de tus carros.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentServices.length ? (
              dashboard.recentServices.map((service) => (
                <div key={service.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{service.serviceType}</div>
                      <div className="text-sm text-[var(--muted)]">
                        {[service.workshopName, service.vehicle?.label, service.serviceDate].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrencyDisplay(service.totalCost, service.currency)}
                    </div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{service.description}</div>
                </div>
              ))
            ) : (
              <EmptyBlock
                actionHref="/app/history/new"
                actionLabel="Registrar servicio"
                description="Tu historial empieza cuando guardas el primer mantenimiento o reparacion."
                title="Todavia no hay servicios registrados"
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/88">
          <CardHeader>
            <CardTitle>Talleres recomendados</CardTitle>
            <CardDescription>Directorio visible con foco en discovery rapido desde movil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.spotlightWorkshops.map((workshop) => (
              <div key={workshop.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{workshop.workshop_name}</div>
                    <div className="text-sm text-[var(--muted)]">
                      {[workshop.city, workshop.workshop_type].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/app/appointments/new?workshop=${workshop.public_slug ?? ""}` as Route}>Cita</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "primary" | "success";
}) {
  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {value}
        </div>
        <Badge variant={tone === "primary" ? "primary" : tone === "success" ? "success" : "default"}>
          {helper}
        </Badge>
      </CardContent>
    </Card>
  );
}

function EmptyBlock({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-5">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</div>
      <div className="mt-4">
        <Button asChild variant="outline">
          <Link href={actionHref as Route}>{actionLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
