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
import { getQuoteDetail, getQuoteStatusLabel } from "@/lib/data/quotes";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

type QuoteDocumentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QuoteDocumentPage({ params }: QuoteDocumentPageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const detail = await getQuoteDetail(id);
  const currencyPrefix = workshop.preferred_currency === "VES" ? "Bs. " : "$";

  return (
    <DocumentShell
      actions={
        <>
          <Button asChild type="button" variant="outline">
            <Link href={`/app/quotes/${detail.quote.id}` as Route}>Volver al presupuesto</Link>
          </Button>
          <DocumentPrintButton />
        </>
      }
      badge="Presupuesto"
      documentCode={detail.quote.id.slice(0, 8).toUpperCase()}
      status={getQuoteStatusLabel(detail.quote.status)}
      title={detail.quote.title}
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
              {
                label: "Unidad",
                value:
                  [detail.vehicle?.make, detail.vehicle?.model, detail.vehicle?.vehicle_year]
                    .filter(Boolean)
                    .join(" ") || "Sin detalle",
              },
            ]}
          />
        </DocumentSection>

        <DocumentSection title="Fechas y lectura">
          <DocumentInfoGrid
            items={[
              { label: "Creado", value: new Date(detail.quote.created_at).toLocaleDateString("es-VE") },
              { label: "Enviado", value: detail.quote.sent_at ? new Date(detail.quote.sent_at).toLocaleDateString("es-VE") : "Pendiente" },
              { label: "Aprobado", value: detail.quote.approved_at ? new Date(detail.quote.approved_at).toLocaleDateString("es-VE") : "Pendiente" },
              { label: "Estado", value: getQuoteStatusLabel(detail.quote.status) },
            ]}
          />
        </DocumentSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DocumentSection title="Mano de obra">
          {detail.laborItems.length ? (
            <DocumentItemsTable currency={currencyPrefix} items={detail.laborItems} typeLabel="Servicio" />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/80 p-4 text-sm text-[var(--muted)]">
              Sin mano de obra cargada.
            </div>
          )}
        </DocumentSection>
        <DocumentSection title="Repuestos">
          {detail.partItems.length ? (
            <DocumentItemsTable currency={currencyPrefix} items={detail.partItems} typeLabel="Repuesto" />
          ) : (
            <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/80 p-4 text-sm text-[var(--muted)]">
              Sin repuestos cargados.
            </div>
          )}
        </DocumentSection>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <DocumentSection title="Notas">
          <div className="rounded-[22px] border border-[var(--line)] bg-white/84 p-4 text-sm leading-6 text-[var(--muted)]">
            {detail.quote.notes || "Sin notas adicionales."}
          </div>
        </DocumentSection>
        <DocumentSection title="Totales">
          <DocumentInfoGrid
            items={[
              {
                label: "Mano de obra",
                value: formatCurrencyDisplay(
                  detail.laborItems.reduce((total, item) => total + item.line_total, 0),
                  workshop.preferred_currency,
                ),
              },
              {
                label: "Repuestos",
                value: formatCurrencyDisplay(
                  detail.partItems.reduce((total, item) => total + item.line_total, 0),
                  workshop.preferred_currency,
                ),
              },
              { label: "Subtotal", value: formatCurrencyDisplay(detail.quote.subtotal, workshop.preferred_currency) },
              { label: "Total", value: formatCurrencyDisplay(detail.quote.total_amount, workshop.preferred_currency) },
            ]}
          />
        </DocumentSection>
      </div>
    </DocumentShell>
  );
}
