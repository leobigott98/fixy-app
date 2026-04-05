import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CalendarClock, CarFront, CircleDollarSign, FileText, MessageCircleMore, Wrench } from "lucide-react";

import { PublicShell } from "@/components/public/public-shell";
import { WhatsAppLinkButton } from "@/components/shared/whatsapp-link-button";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicWorkOrderDetailByToken } from "@/lib/data/public-shares";
import { getWorkOrderStatusLabel } from "@/lib/data/work-orders";
import { buildPublicWorkOrderDocumentPath } from "@/lib/share-links";
import { formatCurrencyDisplay } from "@/lib/utils";
import { buildVehicleSummary, buildWhatsAppHref } from "@/lib/whatsapp";
import type { Route } from "next";
import Link from "next/link";

type PublicWorkOrderPageProps = {
  params: Promise<{
    token: string;
  }>;
};

const orderedStatuses = [
  "presupuesto_pendiente",
  "diagnostico_pendiente",
  "en_reparacion",
  "listo_para_entrega",
  "completada",
] as const;

export default async function PublicWorkOrderPage({ params }: PublicWorkOrderPageProps) {
  const { token } = await params;
  const detail = await getPublicWorkOrderDetailByToken(token);

  if (!detail) {
    notFound();
  }

  const workshopContactHref = buildWhatsAppHref(
    detail.workshop.whatsapp_phone,
    `Hola ${detail.workshop.workshop_name}, estoy revisando el estado de la orden ${detail.workOrder.code || detail.workOrder.title} para ${buildVehicleSummary(detail.vehicle)}.`,
  );

  const showPickupSummary =
    detail.workOrder.status === "listo_para_entrega" || detail.workOrder.status === "completada";

  return (
    <PublicShell
      actions={
        <>
          <WhatsAppLinkButton href={workshopContactHref} label="Hablar con el taller" variant="outline" />
          <Button asChild variant="outline">
            <Link href={buildPublicWorkOrderDocumentPath(token) as Route}>
              <FileText className="size-4" />
              Guardar PDF
            </Link>
          </Button>
        </>
      }
      badge="Seguimiento del trabajo"
      subtitle="Consulta el estado de tu vehículo en una vista clara, móvil y fácil de compartir."
      title={detail.workOrder.title}
      workshop={{
        name: detail.workshop.workshop_name,
        city: detail.workshop.city,
        phone: detail.workshop.whatsapp_phone,
        logoUrl: detail.workshop.logo_url,
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Estado actual" value={<WorkOrderStatusBadge status={detail.workOrder.status} />} />
        <Metric label="Vehículo" value={buildVehicleSummary(detail.vehicle)} />
        <Metric label="Promesa" value={detail.workOrder.promised_date || "Sin fecha"} />
        <Metric label="Total" value={formatCurrencyDisplay(detail.workOrder.total_amount, detail.workshop.preferred_currency)} />
      </div>

      {showPickupSummary ? (
        <Card className="bg-[linear-gradient(135deg,rgba(21,128,61,0.14),rgba(255,255,255,0.94))]">
          <CardContent className="grid gap-4 px-5 py-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-2">
              <Badge variant="success">Listo para retirar</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                {detail.vehicle?.vehicle_label || "Tu vehículo"} {detail.workOrder.status === "completada" ? "ya fue entregado o cerrado" : "ya está listo"}
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                El taller ya puede coordinar entrega contigo. Si quieres confirmar horario o resolver una duda, puedes escribirles directo por WhatsApp.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <PickupMetric label="Cobrado" value={formatCurrencyDisplay(detail.paymentSummary.totalCollected, detail.workshop.preferred_currency)} />
              <PickupMetric label="Saldo pendiente" value={formatCurrencyDisplay(detail.paymentSummary.pendingBalance, detail.workshop.preferred_currency)} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
        <Card className="bg-white/86">
          <CardContent className="space-y-5 px-5 py-5">
            <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              Estado del trabajo
            </div>
            <div className="grid gap-3">
              {orderedStatuses.map((status, index) => {
                const currentIndex = orderedStatuses.indexOf(detail.workOrder.status as (typeof orderedStatuses)[number]);
                const isDone = index <= currentIndex;
                const isCurrent = detail.workOrder.status === status;

                return (
                  <div
                    key={status}
                    className={
                      isCurrent
                        ? "rounded-[24px] border border-[rgba(249,115,22,0.24)] bg-[rgba(249,115,22,0.08)] p-4"
                        : "rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{getWorkOrderStatusLabel(status)}</div>
                      <Badge variant={isDone ? "success" : "default"}>
                        {isCurrent ? "Actual" : isDone ? "Cumplido" : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              Contexto de la orden
            </div>
            <InfoRow icon={<CarFront className="size-4" />} label="Vehículo" value={buildVehicleSummary(detail.vehicle)} />
            <InfoRow icon={<MessageCircleMore className="size-4" />} label="Cliente" value={detail.client?.full_name || "Cliente"} />
            <InfoRow icon={<CalendarClock className="size-4" />} label="Promesa" value={detail.workOrder.promised_date || "Sin fecha"} />
            <InfoRow icon={<Wrench className="size-4" />} label="Código" value={detail.workOrder.code || "Sin código"} />
            {detail.workOrder.notes ? (
              <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                {detail.workOrder.notes}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ItemsCard
          currency={detail.workshop.preferred_currency}
          emptyText="Todavía no hay servicios visibles en esta orden."
          items={detail.services}
          title="Servicios realizados"
        />
        <ItemsCard
          currency={detail.workshop.preferred_currency}
          emptyText="Todavía no hay repuestos visibles en esta orden."
          items={detail.parts}
          title="Repuestos usados"
        />
      </div>

      <Card className="bg-white/86">
        <CardContent className="space-y-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <CircleDollarSign className="size-5 text-[var(--secondary)]" />
            <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              Resumen de pago
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoCard label="Pagos registrados" value={String(detail.paymentSummary.paymentCount)} />
            <InfoCard label="Cobrado" value={formatCurrencyDisplay(detail.paymentSummary.totalCollected, detail.workshop.preferred_currency)} />
            <InfoCard label="Pendiente" value={formatCurrencyDisplay(detail.paymentSummary.pendingBalance, detail.workshop.preferred_currency)} />
          </div>
        </CardContent>
      </Card>
    </PublicShell>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="bg-white/84">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-medium">{value}</div>
      </CardContent>
    </Card>
  );
}

function PickupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[rgba(21,128,61,0.16)] bg-white/84 p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-2 text-sm font-medium text-[var(--foreground)]">{value}</div>
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
      <CardContent className="space-y-3 px-5 py-5">
        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">{title}</div>
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="font-medium">{item.description}</div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span>Cant: {item.quantity}</span>
                <span>Unit: {formatCurrencyDisplay(item.unit_price, currency)}</span>
                <span>Total: {formatCurrencyDisplay(item.line_total, currency)}</span>
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
