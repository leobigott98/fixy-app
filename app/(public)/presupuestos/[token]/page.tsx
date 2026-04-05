import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, MessageCircleMore, ShieldCheck } from "lucide-react";

import { PublicQuoteApprovalCard } from "@/components/public/public-quote-approval-card";
import { PublicShell } from "@/components/public/public-shell";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { WhatsAppLinkButton } from "@/components/shared/whatsapp-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicQuoteDetailByToken } from "@/lib/data/public-shares";
import { buildPublicQuoteDocumentPath } from "@/lib/share-links";
import { formatCurrencyDisplay } from "@/lib/utils";
import { buildVehicleSummary, buildWhatsAppHref } from "@/lib/whatsapp";

type PublicQuotePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicQuotePage({ params }: PublicQuotePageProps) {
  const { token } = await params;
  const detail = await getPublicQuoteDetailByToken(token);

  if (!detail) {
    notFound();
  }

  const workshopContactHref = buildWhatsAppHref(
    detail.workshop.whatsapp_phone,
    `Hola ${detail.workshop.workshop_name}, estoy revisando el presupuesto ${detail.quote.id.slice(0, 8).toUpperCase()} de ${buildVehicleSummary(detail.vehicle)}.`,
  );

  return (
    <PublicShell
      actions={
        <>
          <WhatsAppLinkButton href={workshopContactHref} label="Hablar con el taller" variant="outline" />
          <Button asChild variant="outline">
            <Link href={buildPublicQuoteDocumentPath(token) as Route}>
              <FileText className="size-4" />
              Guardar PDF
            </Link>
          </Button>
        </>
      }
      badge="Presupuesto digital"
      subtitle="Fixy ayuda al taller a cotizar con mejor lectura, confianza y una aprobacion mucho mas clara para ti."
      title={detail.quote.title}
      workshop={{
        name: detail.workshop.workshop_name,
        city: detail.workshop.city,
        phone: detail.workshop.whatsapp_phone,
        logoUrl: detail.workshop.logo_url,
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Estado" value={<QuoteStatusBadge status={detail.quote.status} />} />
        <Metric label="Fecha" value={new Date(detail.quote.created_at).toLocaleDateString("es-VE")} />
        <Metric label="Vehículo" value={detail.vehicle?.vehicle_label || detail.vehicle?.plate || "Pendiente"} />
        <Metric label="Total" value={formatCurrencyDisplay(detail.quote.total_amount, detail.workshop.preferred_currency)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <Card className="bg-white/86">
            <CardContent className="space-y-4 px-5 py-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-[var(--secondary)]" />
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  Resumen del servicio
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="Cliente" value={detail.client?.full_name || "Cliente"} />
                <InfoCard label="Taller" value={detail.workshop.workshop_name} />
                <InfoCard label="Vehículo" value={buildVehicleSummary(detail.vehicle)} />
                <InfoCard
                  label="Unidad"
                  value={[detail.vehicle?.make, detail.vehicle?.model, detail.vehicle?.vehicle_year].filter(Boolean).join(" ") || "Sin detalle"}
                />
              </div>

              {detail.quote.notes ? (
                <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                  {detail.quote.notes}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <ItemsCard
              currency={detail.workshop.preferred_currency}
              emptyText="No hay mano de obra cargada en este presupuesto."
              items={detail.laborItems}
              title="Mano de obra"
            />
            <ItemsCard
              currency={detail.workshop.preferred_currency}
              emptyText="No hay repuestos cargados en este presupuesto."
              items={detail.partItems}
              title="Repuestos"
            />
          </div>
        </div>

        <div className="space-y-4">
          <PublicQuoteApprovalCard
            approvedAt={detail.quote.approved_at}
            canApprove={detail.canApprove}
            token={token}
          />

          <Card className="bg-[var(--foreground)] text-white">
            <CardContent className="space-y-4 px-5 py-5">
              <Badge variant="dark">Totales</Badge>
              <TotalRow
                label="Mano de obra"
                value={formatCurrencyDisplay(
                  detail.laborItems.reduce((total, item) => total + item.line_total, 0),
                  detail.workshop.preferred_currency,
                )}
              />
              <TotalRow
                label="Repuestos"
                value={formatCurrencyDisplay(
                  detail.partItems.reduce((total, item) => total + item.line_total, 0),
                  detail.workshop.preferred_currency,
                )}
              />
              <TotalRow
                label="Subtotal"
                value={formatCurrencyDisplay(detail.quote.subtotal, detail.workshop.preferred_currency)}
              />
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-white/70">Total</div>
                <div className="mt-2 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
                  {formatCurrencyDisplay(detail.quote.total_amount, detail.workshop.preferred_currency)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white/86 p-4">
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

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/8 p-4">
      <div className="text-sm text-white/72">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
