import Link from "next/link";
import type { Route } from "next";
import { CarFront, CreditCard, MessageCircleMore, Phone, Plus, ReceiptText, SquarePen, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { WhatsAppLinkButton } from "@/components/shared/whatsapp-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getClientDetail, getClientEditHref } from "@/lib/data/clients";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";
import {
  buildClientGreetingMessage,
  buildVehicleSummary,
  buildWhatsAppHref,
} from "@/lib/whatsapp";

type ClientDetailPageProps = {
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

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const detail = await getClientDetail(id);
  const { client, vehicles, quotes, workOrders, paymentSummary } = detail;
  const whatsappHref = buildWhatsAppHref(
    client.whatsapp_phone || client.phone,
    buildClientGreetingMessage({
      clientName: client.full_name,
      workshopName: workshop.workshop_name,
      vehicleSummary: vehicles[0] ? buildVehicleSummary(vehicles[0]) : null,
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.full_name}
        description="Ficha del cliente con vehiculos vinculados, actividad comercial y base de cobros."
        status="Cliente"
        action={{ label: "Editar cliente", icon: <SquarePen className="size-4" />, href: getClientEditHref(client.id) }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="primary">
          <Link href={`/app/quotes/new?clientId=${client.id}` as Route}>
            <ReceiptText className="size-4" />
            Nuevo presupuesto
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/app/work-orders/new?clientId=${client.id}` as Route}>
            <Wrench className="size-4" />
            Nueva orden
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/app/vehicles/new?clientId=${client.id}` as Route}>
            <CarFront className="size-4" />
            Nuevo vehiculo
          </Link>
        </Button>
        <WhatsAppLinkButton href={whatsappHref} label="WhatsApp" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Vehiculos" value={String(vehicles.length)} />
        <Metric label="Presupuestos" value={String(quotes.length)} />
        <Metric label="Ordenes" value={String(workOrders.length)} />
        <Metric
          label="Cobros vinculados"
          value={formatCurrencyDisplay(paymentSummary.totalCollected, "USD")}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
            <CardDescription>
              Todo el contexto minimo para responder sin salir del flujo del taller.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Telefono", value: client.phone || "No cargado", icon: <Phone className="size-4" /> },
              { label: "WhatsApp", value: client.whatsapp_phone || "No cargado", icon: <MessageCircleMore className="size-4" /> },
              { label: "Correo", value: client.email || "Opcional", icon: <ReceiptText className="size-4" /> },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                <div className="mt-0.5 text-[var(--primary-strong)]">{item.icon}</div>
                <div>
                  <div className="text-sm text-[var(--muted)]">{item.label}</div>
                  <div className="mt-1 font-medium">{item.value}</div>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4">
              <div className="text-sm font-medium text-[var(--foreground)]">Notas</div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {client.notes || "Sin notas todavia."}
              </div>
            </div>
            <WhatsAppLinkButton href={whatsappHref} label="Escribir por WhatsApp" variant="primary" />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Vehiculos vinculados</CardTitle>
              <CardDescription>
                La relacion cliente-vehiculo es el punto de partida para quotes y ordenes.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={`/app/vehicles/new?clientId=${client.id}` as Route}>
                <Plus className="size-4" />
                Nuevo vehiculo
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicles.length ? (
              vehicles.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 hover:bg-[rgba(249,115,22,0.05)]"
                  href={`/app/vehicles/${vehicle.id}` as Route}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                      <CarFront className="size-4" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {vehicle.vehicle_label || [vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {vehicle.plate || "Sin placa"} - {vehicle.color || "Color opcional"}
                      </div>
                    </div>
                  </div>
                  <Badge>{vehicle.mileage ? `${vehicle.mileage.toLocaleString("es-VE")} km` : "Sin km"}</Badge>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
                Este cliente aun no tiene vehiculos registrados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <LinkedListCard
          emptyText="Todavia no hay presupuestos para este cliente."
          icon={<ReceiptText className="size-4" />}
          items={quotes.map((quote) => ({
            id: quote.id,
            title: quote.title,
            meta: `${formatQuoteStatus(quote.status)} - ${formatCurrencyDisplay(Number(quote.total_amount ?? 0), "USD")}`,
          }))}
          title="Presupuestos vinculados"
        />
        <LinkedListCard
          emptyText="Todavia no hay ordenes para este cliente."
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
            <CardTitle>Resumen de cobros</CardTitle>
            <CardDescription>
              Base inicial para el flujo de pagos del cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="text-sm text-[var(--muted)]">Pagos registrados</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                {paymentSummary.paymentCount}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="text-sm text-[var(--muted)]">Monto acumulado</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                {formatCurrencyDisplay(paymentSummary.totalCollected, "USD")}
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
              La trazabilidad de pagos por cliente ya tiene espacio reservado para crecer con
              finanzas y cobranza.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white/84">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function LinkedListCard({
  title,
  items,
  emptyText,
  icon,
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string }>;
  emptyText: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-white/86">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Base lista para que este historial crezca sin reestructurar la ficha.</CardDescription>
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
