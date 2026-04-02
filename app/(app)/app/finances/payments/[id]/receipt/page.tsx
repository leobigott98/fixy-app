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
import { getPaymentReceiptDetail } from "@/lib/data/finances";
import { getWorkOrderDetail } from "@/lib/data/work-orders";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/finances/constants";
import { formatCurrencyDisplay } from "@/lib/utils";

type PaymentReceiptPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PaymentReceiptPage({ params }: PaymentReceiptPageProps) {
  const { id } = await params;
  const detail = await getPaymentReceiptDetail(id);
  const workOrderDetail = detail.workOrder ? await getWorkOrderDetail(detail.workOrder.id) : null;
  const currencyPrefix = detail.workshop.preferred_currency === "VES" ? "Bs. " : "$";

  return (
    <DocumentShell
      actions={
        <>
          <Button asChild type="button" variant="outline">
            <Link href={"/app/finances" as Route}>Volver a finanzas</Link>
          </Button>
          <DocumentPrintButton />
        </>
      }
      badge="Recibo de pago"
      documentCode={detail.workOrder?.code || detail.payment.id.slice(0, 8).toUpperCase()}
      status={getPaymentStatusLabel(detail.payment.status)}
      title="Recibo profesional de cobro"
      workshop={{
        name: detail.workshop.workshop_name,
        city: detail.workshop.city,
        phone: detail.workshop.whatsapp_phone,
        ownerName: detail.workshop.owner_name,
        openingHours: detail.workshop.opening_hours_label,
        logoUrl: detail.workshop.logo_url,
      }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <DocumentSection description="Datos del pago y del cliente." title="Resumen del recibo">
          <DocumentInfoGrid
            items={[
              { label: "Cliente", value: detail.client?.full_name || "Cliente pendiente" },
              { label: "WhatsApp", value: detail.client?.whatsapp_phone || "Sin contacto" },
              { label: "Fecha de pago", value: new Date(detail.payment.paid_at).toLocaleDateString("es-VE") },
              { label: "Metodo", value: getPaymentMethodLabel(detail.payment.method) },
              { label: "Monto", value: formatCurrencyDisplay(detail.payment.amount, detail.workshop.preferred_currency) },
              { label: "Estado", value: getPaymentStatusLabel(detail.payment.status) },
            ]}
          />
        </DocumentSection>

        <DocumentSection description="Relacion del cobro con la operacion del taller." title="Orden vinculada">
          <DocumentInfoGrid
            items={[
              { label: "Orden", value: detail.workOrder?.title || "Pago sin orden vinculada" },
              { label: "Codigo", value: detail.workOrder?.code || "Sin codigo" },
              { label: "Vehiculo", value: detail.workOrder?.vehicle_label || "Sin vehiculo" },
              { label: "Promesa", value: detail.workOrder?.promised_date || "Sin fecha" },
            ]}
          />
        </DocumentSection>
      </div>

      {workOrderDetail ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <DocumentSection title="Servicios vinculados">
            {workOrderDetail.services.length ? (
              <DocumentItemsTable
                currency={currencyPrefix}
                items={workOrderDetail.services}
                typeLabel="Servicio"
              />
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/80 p-4 text-sm text-[var(--muted)]">
                Esta orden no tiene servicios cargados.
              </div>
            )}
          </DocumentSection>
          <DocumentSection title="Repuestos vinculados">
            {workOrderDetail.parts.length ? (
              <DocumentItemsTable
                currency={currencyPrefix}
                items={workOrderDetail.parts}
                typeLabel="Repuesto"
              />
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/80 p-4 text-sm text-[var(--muted)]">
                Esta orden no tiene repuestos cargados.
              </div>
            )}
          </DocumentSection>
        </div>
      ) : null}

      <DocumentSection title="Notas">
        <div className="rounded-[22px] border border-[var(--line)] bg-white/84 p-4 text-sm leading-6 text-[var(--muted)]">
          {detail.payment.notes || "Pago registrado sin notas adicionales."}
        </div>
      </DocumentSection>
    </DocumentShell>
  );
}
