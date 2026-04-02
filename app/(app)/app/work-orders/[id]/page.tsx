import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CarFront,
  ClipboardList,
  Coins,
  MessageCircleMore,
  SquarePen,
  UserRound,
  Wrench,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status-badge";
import { WorkOrderStatusControl } from "@/components/work-orders/work-order-status-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWorkOrderDetail,
  getWorkOrderEditHref,
  getWorkOrderStatusLabel,
} from "@/lib/data/work-orders";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

type WorkOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function WorkOrderDetailPage({ params }: WorkOrderDetailPageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const detail = await getWorkOrderDetail(id);
  const { workOrder, client, vehicle, quote, services, parts, statusHistory, paymentSummary } =
    detail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={workOrder.title}
        description="Detalle operativo de la orden con estado visible, items separados, responsable y trazabilidad de avance."
        status={getWorkOrderStatusLabel(workOrder.status)}
        action={{
          label: "Editar orden",
          icon: <SquarePen className="size-4" />,
          href: getWorkOrderEditHref(workOrder.id),
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        {client ? (
          <Button asChild variant="outline">
            <Link href={`/app/clients/${client.id}` as Route}>
              <UserRound className="size-4" />
              Ver cliente
            </Link>
          </Button>
        ) : null}
        {vehicle ? (
          <Button asChild variant="outline">
            <Link href={`/app/vehicles/${vehicle.id}` as Route}>
              <CarFront className="size-4" />
              Ver vehiculo
            </Link>
          </Button>
        ) : null}
        {quote ? (
          <Button asChild variant="outline">
            <Link href={`/app/quotes/${quote.id}` as Route}>
              <ClipboardList className="size-4" />
              Ver presupuesto
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="primary">
          <Link href={`/app/finances/payments/new?clientId=${client?.id ?? ""}&workOrderId=${workOrder.id}` as Route}>
            <Coins className="size-4" />
            Registrar pago
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Codigo" value={workOrder.code || "Sin codigo"} />
        <Metric label="Servicios" value={String(services.length)} />
        <Metric label="Repuestos" value={String(parts.length)} />
        <Metric
          label="Total"
          value={formatCurrencyDisplay(workOrder.total_amount, workshop.preferred_currency)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Contexto de la orden</CardTitle>
            <CardDescription>
              Todo lo necesario para mover la unidad dentro del taller sin abrir mas pantallas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={<Wrench className="size-4" />}
              label="Etapa actual"
              value={<WorkOrderStatusBadge status={workOrder.status} />}
            />
            <InfoRow
              icon={<UserRound className="size-4" />}
              label="Cliente"
              value={client?.full_name || "Cliente pendiente"}
            />
            <InfoRow
              icon={<CarFront className="size-4" />}
              label="Vehiculo"
              value={vehicle?.vehicle_label || vehicle?.plate || "Vehiculo pendiente"}
            />
            <InfoRow
              icon={<MessageCircleMore className="size-4" />}
              label="WhatsApp"
              value={client?.whatsapp_phone || "Sin contacto"}
            />
            <InfoRow
              icon={<Wrench className="size-4" />}
              label="Asignado a"
              value={workOrder.assigned_mechanic_name || "Sin responsable"}
            />
            <InfoRow
              icon={<CalendarDays className="size-4" />}
              label="Promesa de entrega"
              value={workOrder.promised_date || "Sin fecha"}
            />
            <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="text-sm font-medium text-[var(--foreground)]">Mover etapa</div>
              <div className="mt-3">
                <WorkOrderStatusControl
                  currentStatus={workOrder.status}
                  workOrderId={workOrder.id}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4">
              <div className="text-sm font-medium text-[var(--foreground)]">Notas</div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {workOrder.notes || "Sin notas adicionales."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen operativo</Badge>
            <CardTitle className="text-white">Costo y lectura rapida</CardTitle>
            <CardDescription className="text-white/74">
              Totales visibles para recepcion, jefe de taller y entrega.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow
              label="Servicios"
              value={formatCurrencyDisplay(
                services.reduce((total, item) => total + Number(item.line_total ?? 0), 0),
                workshop.preferred_currency,
              )}
            />
            <SummaryRow
              label="Repuestos"
              value={formatCurrencyDisplay(
                parts.reduce((total, item) => total + Number(item.line_total ?? 0), 0),
                workshop.preferred_currency,
              )}
            />
            <SummaryRow
              label="Cobrado"
              value={formatCurrencyDisplay(
                paymentSummary.totalCollected,
                workshop.preferred_currency,
              )}
            />
            <SummaryRow
              label="Pendiente"
              value={formatCurrencyDisplay(
                paymentSummary.pendingBalance,
                workshop.preferred_currency,
              )}
            />
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-white/64">Total de la orden</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
                {formatCurrencyDisplay(workOrder.total_amount, workshop.preferred_currency)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ItemsCard
          currency={workshop.preferred_currency}
          emptyText="Todavia no hay servicios cargados en esta orden."
          items={services}
          title="Servicios"
        />
        <ItemsCard
          currency={workshop.preferred_currency}
          emptyText="Todavia no hay repuestos cargados en esta orden."
          items={parts}
          title="Repuestos usados"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Historial de estados</CardTitle>
            <CardDescription>
              Trazabilidad minima para saber como se ha movido la orden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusHistory.length ? (
              statusHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{new Date(entry.changed_at).toLocaleDateString("es-VE")}</Badge>
                    <WorkOrderStatusBadge
                      status={entry.to_status as typeof workOrder.status}
                    />
                  </div>
                  <div className="mt-2 text-sm font-medium text-[var(--foreground)]">
                    {entry.from_status
                      ? `${getWorkOrderStatusLabel(entry.from_status as typeof workOrder.status)} -> ${getWorkOrderStatusLabel(entry.to_status as typeof workOrder.status)}`
                      : `Creada en ${getWorkOrderStatusLabel(entry.to_status as typeof workOrder.status)}`}
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {entry.note || "Sin comentario adicional."}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
                El historial de movimientos aparecera aqui a medida que cambie de etapa.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Resumen de cobro</CardTitle>
            <CardDescription>
              Base lista para conectar pagos y entrega sin cambiar la ficha de la orden.
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
              <div className="text-sm text-[var(--muted)]">Monto cobrado</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                {formatCurrencyDisplay(paymentSummary.totalCollected, workshop.preferred_currency)}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="text-sm text-[var(--muted)]">Saldo pendiente</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                {formatCurrencyDisplay(paymentSummary.pendingBalance, workshop.preferred_currency)}
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
              <Coins className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
              El flujo de cobro ya puede registrarse desde esta orden sin salir del contexto del trabajo.
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
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="mt-0.5 text-[var(--primary-strong)]">{icon}</div>
      <div>
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="mt-1 font-medium">{value}</div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/8 p-4">
      <div className="text-sm text-white/72">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ItemsCard({
  title,
  items,
  emptyText,
  currency,
}: {
  title: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  emptyText: string;
  currency: "USD" | "VES" | "USD_VES";
}) {
  return (
    <Card className="bg-white/86">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Lectura separada para que la orden se entienda rapido en el taller.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="font-medium">{item.description}</div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span>Cant: {item.quantity}</span>
                <span>Unit: {formatCurrencyDisplay(Number(item.unit_price ?? 0), currency)}</span>
                <span>Total: {formatCurrencyDisplay(Number(item.line_total ?? 0), currency)}</span>
              </div>
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
