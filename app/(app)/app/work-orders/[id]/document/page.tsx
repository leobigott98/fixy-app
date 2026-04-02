import type { Route } from "next";
import Link from "next/link";

import { DocumentPrintButton } from "@/components/documents/document-print-button";
import {
  DocumentInfoGrid,
  DocumentItemsTable,
  DocumentSection,
  DocumentShell,
} from "@/components/documents/document-shell";
import { Button } from "@/components/ui/button";
import { getWorkOrderDetail, getWorkOrderStatusLabel } from "@/lib/data/work-orders";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

type WorkOrderDocumentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function WorkOrderDocumentPage({ params }: WorkOrderDocumentPageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const detail = await getWorkOrderDetail(id);
  const currencyPrefix = workshop.preferred_currency === "VES" ? "Bs. " : "$";

  return (
    <DocumentShell
      actions={
        <>
          <Button asChild type="button" variant="outline">
            <Link href={`/app/work-orders/${detail.workOrder.id}` as Route}>Volver a la orden</Link>
          </Button>
          <DocumentPrintButton />
        </>
      }
      badge="Orden de trabajo"
      documentCode={detail.workOrder.code}
      status={getWorkOrderStatusLabel(detail.workOrder.status)}
      title={detail.workOrder.title}
      workshop={{
        name: workshop.workshop_name,
        city: workshop.city,
        phone: workshop.whatsapp_phone,
        ownerName: workshop.owner_name,
        openingHours: workshop.opening_hours_label,
        logoUrl: workshop.logo_url,
      }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <DocumentSection title="Cliente y vehiculo">
          <DocumentInfoGrid
            items={[
              { label: "Cliente", value: detail.client?.full_name || "Cliente pendiente" },
              { label: "WhatsApp", value: detail.client?.whatsapp_phone || "Sin contacto" },
              { label: "Vehiculo", value: detail.vehicle?.vehicle_label || detail.vehicle?.plate || "Vehiculo pendiente" },
              { label: "Promesa", value: detail.workOrder.promised_date || "Sin fecha" },
            ]}
          />
        </DocumentSection>
        <DocumentSection title="Operacion del trabajo">
          <DocumentInfoGrid
            items={[
              { label: "Estado", value: getWorkOrderStatusLabel(detail.workOrder.status) },
              { label: "Responsable", value: detail.workOrder.assigned_mechanic_name || "Sin asignar" },
              { label: "Creada", value: new Date(detail.workOrder.created_at).toLocaleDateString("es-VE") },
              { label: "Presupuesto", value: detail.quote?.title || "Sin presupuesto vinculado" },
            ]}
          />
        </DocumentSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DocumentSection title="Servicios">
          {detail.services.length ? (
            <DocumentItemsTable currency={currencyPrefix} items={detail.services} typeLabel="Servicio" />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/80 p-4 text-sm text-[var(--muted)]">
              Sin servicios cargados.
            </div>
          )}
        </DocumentSection>
        <DocumentSection title="Repuestos">
          {detail.parts.length ? (
            <DocumentItemsTable currency={currencyPrefix} items={detail.parts} typeLabel="Repuesto" />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/80 p-4 text-sm text-[var(--muted)]">
              Sin repuestos cargados.
            </div>
          )}
        </DocumentSection>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <DocumentSection title="Notas y hallazgos">
          <div className="rounded-[22px] border border-[var(--line)] bg-white/84 p-4 text-sm leading-6 text-[var(--muted)]">
            {detail.workOrder.notes || "Sin notas adicionales."}
          </div>
        </DocumentSection>
        <DocumentSection title="Resumen economico">
          <DocumentInfoGrid
            items={[
              {
                label: "Servicios",
                value: formatCurrencyDisplay(
                  detail.services.reduce((total, item) => total + item.line_total, 0),
                  workshop.preferred_currency,
                ),
              },
              {
                label: "Repuestos",
                value: formatCurrencyDisplay(
                  detail.parts.reduce((total, item) => total + item.line_total, 0),
                  workshop.preferred_currency,
                ),
              },
              {
                label: "Cobrado",
                value: formatCurrencyDisplay(detail.paymentSummary.totalCollected, workshop.preferred_currency),
              },
              {
                label: "Saldo pendiente",
                value: formatCurrencyDisplay(detail.paymentSummary.pendingBalance, workshop.preferred_currency),
              },
            ]}
          />
        </DocumentSection>
      </div>
    </DocumentShell>
  );
}
