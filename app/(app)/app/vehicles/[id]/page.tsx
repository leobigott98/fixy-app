import Link from "next/link";
import type { ReactNode } from "react";
import type { Route } from "next";
import { CalendarDays, ClipboardList, Coins, History, Package, SquarePen, UserRound, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getVehicleDetail, getVehicleEditHref } from "@/lib/data/vehicles";
import { formatCurrencyDisplay } from "@/lib/utils";

type VehicleDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatQuoteStatus(status: string) {
  switch (status) {
    case "draft":
      return "Borrador";
    case "sent":
      return "Enviado";
    case "approved":
      return "Aprobado";
    case "rejected":
      return "Rechazado";
    default:
      return status;
  }
}

function formatWorkOrderStatus(status: string) {
  switch (status) {
    case "presupuesto_pendiente":
      return "Presupuesto pendiente";
    case "diagnostico_pendiente":
      return "Diagnostico pendiente";
    case "en_reparacion":
      return "En reparacion";
    case "listo_para_entrega":
      return "Listo para entrega";
    case "completada":
      return "Completada";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { id } = await params;
  const detail = await getVehicleDetail(id);
  const { vehicle, owner, quotes, workOrders, photos, repairHistory } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={vehicle.vehicle_label || [vehicle.make, vehicle.model].filter(Boolean).join(" ")}
        description="Ficha del vehiculo con propietario, contexto tecnico y espacio claro para historial y trabajos."
        status={vehicle.plate || "Vehiculo"}
        action={{ label: "Editar vehiculo", icon: <SquarePen className="size-4" />, href: getVehicleEditHref(vehicle.id) }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="primary">
          <Link href={`/app/quotes/new?clientId=${vehicle.client_id ?? ""}&vehicleId=${vehicle.id}` as Route}>
            <ClipboardList className="size-4" />
            Nuevo presupuesto
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/app/work-orders/new?clientId=${vehicle.client_id ?? ""}&vehicleId=${vehicle.id}` as Route}>
            <Wrench className="size-4" />
            Nueva orden
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Presupuestos recientes" value={String(quotes.length)} />
        <Metric label="Ordenes recientes" value={String(workOrders.length)} />
        <Metric label="Historial cerrado" value={String(repairHistory.length)} />
        <Metric label="Kilometraje" value={vehicle.mileage ? `${vehicle.mileage}` : "Sin km"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Propietario y datos base</CardTitle>
            <CardDescription>
              Todo el contexto necesario para abrir trabajo sin perder trazabilidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 hover:bg-[rgba(249,115,22,0.05)]"
              href={owner ? (`/app/clients/${owner.id}` as Route) : ("/app/clients" as Route)}
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                  <UserRound className="size-4" />
                </div>
                <div>
                  <div className="text-sm text-[var(--muted)]">Cliente</div>
                  <div className="mt-1 font-medium">{owner?.full_name || "Sin cliente"}</div>
                </div>
              </div>
              <Badge>{owner?.whatsapp_phone || owner?.phone || "Sin contacto"}</Badge>
            </Link>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="Marca" value={vehicle.make || "No cargada"} />
              <InfoCard label="Modelo" value={vehicle.model || "No cargado"} />
              <InfoCard label="Anio" value={vehicle.vehicle_year ? String(vehicle.vehicle_year) : "No cargado"} />
              <InfoCard label="Color" value={vehicle.color || "Opcional"} />
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4">
              <div className="text-sm font-medium text-[var(--foreground)]">Notas</div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {vehicle.notes || "Sin notas tecnicas todavia."}
              </div>
            </div>
            <PhotoGallery photos={photos.map((photo) => photo.photo_url)} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <LinkedActivityCard
            emptyText="Todavia no hay presupuestos para este vehiculo."
            icon={<ClipboardList className="size-4" />}
            items={quotes.map((quote) => ({
              id: quote.id,
              title: quote.title,
              meta: `${formatQuoteStatus(quote.status)} - ${formatCurrencyDisplay(Number(quote.total_amount ?? 0), "USD")}`,
            }))}
            title="Presupuestos vinculados"
          />
          <LinkedActivityCard
            emptyText="Todavia no hay ordenes de trabajo para este vehiculo."
            icon={<Wrench className="size-4" />}
            items={workOrders.map((order) => ({
              id: order.id,
              title: order.title,
              meta: `${formatWorkOrderStatus(order.status)} - ${formatCurrencyDisplay(Number(order.total_amount ?? 0), "USD")}`,
            }))}
            title="Ordenes vinculadas"
          />
          <Card className="bg-white/86">
            <CardHeader>
              <CardTitle>Historial de reparaciones</CardTitle>
              <CardDescription>
                Ordenes completadas, trabajos realizados y trazabilidad clara para el taller y el cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RepairHistoryTimeline entries={repairHistory} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white/84">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  );
}

function LinkedActivityCard({
  title,
  items,
  emptyText,
  icon,
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string }>;
  emptyText: string;
  icon: ReactNode;
}) {
  return (
    <Card className="bg-white/86">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Este bloque queda listo para crecer con el flujo operativo del taller.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="flex items-center gap-2">
                <div className="text-[var(--primary-strong)]">{icon}</div>
                <div className="font-medium">{item.title}</div>
              </div>
              <div className="mt-2 text-sm text-[var(--muted)]">{item.meta}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RepairHistoryTimeline({
  entries,
}: {
  entries: Awaited<ReturnType<typeof getVehicleDetail>>["repairHistory"];
}) {
  if (!entries.length) {
    return (
      <div className="flex gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
        <History className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
        Cuando cierres ordenes de trabajo, aqui se va armando la historia tecnica del vehiculo con fechas,
        servicios, repuestos y respaldo de cobros.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={entry.workOrder.id} className="relative pl-7">
          {index < entries.length - 1 ? (
            <div className="absolute left-3 top-7 h-[calc(100%+0.75rem)] w-px bg-[var(--line)]" />
          ) : null}
          <div className="absolute left-0 top-3 flex size-6 items-center justify-center rounded-full bg-[rgba(249,115,22,0.14)] text-[var(--primary-strong)]">
            <History className="size-3.5" />
          </div>

          <div className="rounded-[28px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-[var(--foreground)]">{entry.workOrder.title}</div>
                  <Badge className="bg-[rgba(22,163,74,0.12)] text-[rgb(21,128,61)]">Completada</Badge>
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {[entry.workOrder.code, formatHistoryDate(entry.workOrder.completed_at ?? entry.workOrder.updated_at)].filter(Boolean).join(" · ")}
                </div>
              </div>

              <Button asChild size="sm" variant="outline">
                <Link href={`/app/work-orders/${entry.workOrder.id}` as Route}>Ver orden</Link>
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <HistoryMetric
                icon={<Wrench className="size-4" />}
                label="Servicios"
                value={String(entry.services.length)}
              />
              <HistoryMetric
                icon={<Package className="size-4" />}
                label="Repuestos"
                value={String(entry.parts.length)}
              />
              <HistoryMetric
                icon={<Coins className="size-4" />}
                label="Cobrado"
                value={formatCurrencyDisplay(entry.paymentSummary.totalCollected, "USD")}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <HistoryBlock
                title="Servicios realizados"
                icon={<Wrench className="size-4" />}
                emptyText="No se cargaron servicios en esta orden."
                items={entry.services.map((service) => ({
                  key: `${entry.workOrder.id}-service-${service.sort_order}-${service.description}`,
                  title: service.description,
                  meta: `${service.quantity} x ${formatCurrencyDisplay(service.unit_price, "USD")} · ${formatCurrencyDisplay(service.line_total, "USD")}`,
                }))}
              />
              <HistoryBlock
                title="Repuestos reemplazados"
                icon={<Package className="size-4" />}
                emptyText="No se cargaron repuestos en esta orden."
                items={entry.parts.map((part) => ({
                  key: `${entry.workOrder.id}-part-${part.sort_order}-${part.description}`,
                  title: part.description,
                  meta: `${part.quantity} x ${formatCurrencyDisplay(part.unit_price, "USD")} · ${formatCurrencyDisplay(part.line_total, "USD")}`,
                }))}
              />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
                <div className="text-sm font-medium text-[var(--foreground)]">Notas de cierre</div>
                <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {entry.workOrder.notes || "Sin notas adicionales en esta orden cerrada."}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
                <div className="text-sm font-medium text-[var(--foreground)]">Resumen de pago</div>
                <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Total orden</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrencyDisplay(entry.workOrder.total_amount, "USD")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Total cobrado</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrencyDisplay(entry.paymentSummary.totalCollected, "USD")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Saldo pendiente</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatCurrencyDisplay(entry.paymentSummary.pendingBalance, "USD")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Ultimo pago</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {entry.paymentSummary.latestPaymentAt ? formatHistoryDate(entry.paymentSummary.latestPaymentAt) : "Sin registro"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {entry.workOrder.assigned_mechanic_name ? (
              <div className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                Responsable: {entry.workOrder.assigned_mechanic_name}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <span className="text-[var(--primary-strong)]">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-2 font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function HistoryBlock({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{ key: string; title: string; meta: string }>;
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <span className="text-[var(--primary-strong)]">{icon}</span>
        <span>{title}</span>
      </div>

      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.key} className="rounded-2xl bg-[rgba(21,28,35,0.03)] p-3">
              <div className="text-sm font-medium text-[var(--foreground)]">{item.title}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.meta}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-3 text-sm leading-6 text-[var(--muted)]">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function PhotoGallery({ photos }: { photos: string[] }) {
  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
        Todavia no hay fotos del vehiculo.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-[var(--foreground)]">Fotos</div>
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <a key={photo} href={photo} rel="noreferrer" target="_blank">
            <img
              alt="Foto del vehiculo"
              className="h-28 w-full rounded-2xl object-cover"
              src={photo}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
