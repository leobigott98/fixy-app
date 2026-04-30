import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CarFront, ClipboardList, Search } from "lucide-react";

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
    tone: "dark" | "gold" | "light";
  }> = [
    {
      href: "/app/my-cars/new" as Route,
      label: "Agregar carro",
      description: "Carga fotos, datos y deja lista la ficha.",
      icon: CarFront,
      tone: "dark",
    },
    {
      href: "/app/workshops" as Route,
      label: "Buscar talleres",
      description: "Descubre opciones reales sin friccion.",
      icon: Search,
      tone: "gold",
    },
    {
      href: "/app/appointments/new" as Route,
      label: "Pedir cita",
      description: "Solicita atencion con tu carro ya seleccionado.",
      icon: CalendarClock,
      tone: "light",
    },
    {
      href: "/app/history/new" as Route,
      label: "Registrar servicio",
      description: "Guarda mantenimiento o reparaciones.",
      icon: ClipboardList,
      tone: "light",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Garage de ${dashboard.profile.fullName}`}
        description="Tu vista movil para carros, talleres, citas y trazabilidad de servicios."
        status="Movilidad al dia"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <ActionTile key={action.label} {...action} />
        ))}
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Mis carros</CardTitle>
                <CardDescription>Fichas listas para pedir cita y guardar servicios.</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={"/app/my-cars" as Route}>Ver todos</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.vehicles.length ? (
              dashboard.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-[18px] border border-[var(--line)] bg-[#fbfaf7] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      {vehicle.photoUrls[0] ? (
                        <img alt={vehicle.label} className="size-20 rounded-[16px] object-cover" src={vehicle.photoUrls[0]} />
                      ) : (
                        <div className="flex size-20 items-center justify-center rounded-[16px] bg-[rgba(201,138,5,0.1)] text-[var(--primary-strong)]">
                          <CarFront className="size-7" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{vehicle.label}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {[vehicle.color, vehicle.plate].filter(Boolean).join(" · ") || "Ficha basica lista"}
                        </div>
                      </div>
                    </div>
                    <Badge variant="success">Activo</Badge>
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Proximas citas</CardTitle>
                <CardDescription>Solicitudes que aun requieren atencion o confirmacion.</CardDescription>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={"/app/appointments" as Route}>Ver todas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.upcomingAppointments.length ? (
              dashboard.upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="grid gap-3 rounded-[18px] border border-[var(--line)] bg-[#fbfaf7] p-4 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                  <div className="flex size-14 flex-col items-center justify-center rounded-[16px] bg-[var(--surface-dark)] text-white">
                    <span className="font-[family-name:var(--font-heading)] text-lg font-bold">
                      {appointment.requestedDate?.slice(-2) || "--"}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-white/68">Cita</span>
                  </div>
                  <div>
                    <div className="font-semibold">{appointment.workshop.name}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {[appointment.requestedTime, appointment.vehicle?.label].filter(Boolean).join(" · ")}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{appointment.issueSummary}</div>
                  </div>
                  <Badge variant={appointment.status === "confirmada" ? "success" : "primary"}>
                    {appointment.status === "confirmada" ? "Confirmada" : "Pendiente"}
                  </Badge>
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
                <div key={service.id} className="rounded-[18px] border border-[var(--line)] bg-[#fbfaf7] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{service.serviceType}</div>
                      <div className="text-sm text-[var(--muted)]">
                        {[service.workshopName, service.vehicle?.label, service.serviceDate].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">
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
              <div key={workshop.id} className="rounded-[18px] border border-[var(--line)] bg-[#fbfaf7] p-4">
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

function ActionTile({
  href,
  label,
  description,
  icon: Icon,
  tone,
}: {
  href: Route;
  label: string;
  description: string;
  icon: typeof CarFront;
  tone: "dark" | "gold" | "light";
}) {
  const isDark = tone === "dark";
  const isGold = tone === "gold";

  return (
    <Link
      href={href}
      className={[
        "group flex min-h-[168px] flex-col justify-between rounded-[22px] border p-5 shadow-[0_16px_34px_rgba(7,31,39,0.08)]",
        isDark
          ? "border-white/10 bg-[var(--surface-dark)] text-white"
          : isGold
            ? "fixy-gold-panel border-transparent"
            : "border-[var(--line)] bg-white/88 text-[var(--foreground)]",
      ].join(" ")}
    >
      <div>
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
        <div className="mt-5 font-[family-name:var(--font-heading)] text-xl font-bold">{label}</div>
        <p className={["mt-2 text-sm leading-6", isDark || isGold ? "text-white/78" : "text-[var(--muted)]"].join(" ")}>
          {description}
        </p>
      </div>
      <ArrowRight className="ml-auto size-5 transition group-hover:translate-x-1" />
    </Link>
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
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[var(--foreground)]">{label}</div>
          <Badge variant={tone === "primary" ? "primary" : tone === "success" ? "success" : "default"}>
            {tone === "primary" ? "Clave" : tone === "success" ? "OK" : "Base"}
          </Badge>
        </div>
        <div className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          {value}
        </div>
        <div className="text-sm leading-6 text-[var(--muted)]">{helper}</div>
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
    <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-[rgba(201,138,5,0.05)] p-5">
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
