import Link from "next/link";
import type { ReactNode } from "react";
import type { Route } from "next";
import { ClipboardList, History, SquarePen, UserRound, Wrench } from "lucide-react";

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
  const { vehicle, owner, quotes, workOrders, photos } = detail;

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
        <Metric label="Presupuestos" value={String(quotes.length)} />
        <Metric label="Ordenes" value={String(workOrders.length)} />
        <Metric label="Kilometraje" value={vehicle.mileage ? `${vehicle.mileage}` : "Sin km"} />
        <Metric label="VIN" value={vehicle.vin ? "Cargado" : "Opcional"} />
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
              <CardTitle>Repair history</CardTitle>
              <CardDescription>
                Espacio reservado para el historial tecnico del vehiculo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
                <History className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
                El historial de reparaciones se montara aqui con cada orden cerrada, manteniendo la
                trazabilidad por vehiculo.
              </div>
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
