import type { ReactNode } from "react";
import { CalendarDays, ClipboardList, MessageCircleMore, Send, SquarePen, Wrench } from "lucide-react";

import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { CreateFromQuoteButton } from "@/components/work-orders/create-from-quote-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuoteDetail, getQuoteEditHref, getQuoteStatusLabel } from "@/lib/data/quotes";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

type QuoteDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const detail = await getQuoteDetail(id);
  const { quote, client, vehicle, laborItems, partItems } = detail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.title}
        description="Presupuesto claro, separado por mano de obra y repuestos, con estado y totales visibles."
        status={getQuoteStatusLabel(quote.status)}
        action={{ label: "Editar presupuesto", icon: <SquarePen className="size-4" />, href: getQuoteEditHref(quote.id) }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Creado" value={new Date(quote.created_at).toLocaleDateString("es-VE")} />
        <Metric label="Estado" value={getQuoteStatusLabel(quote.status)} />
        <Metric label="Items" value={String(laborItems.length + partItems.length)} />
        <Metric label="Total" value={formatCurrencyDisplay(quote.total_amount, workshop.preferred_currency)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Contexto del presupuesto</CardTitle>
            <CardDescription>
              Cliente, vehiculo y fechas clave visibles sin abrir mas pantallas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow icon={<ClipboardList className="size-4" />} label="Estado" value={<QuoteStatusBadge status={quote.status} />} />
            <InfoRow icon={<MessageCircleMore className="size-4" />} label="Cliente" value={client?.full_name || "Cliente pendiente"} />
            <InfoRow icon={<Wrench className="size-4" />} label="Vehiculo" value={vehicle?.vehicle_label || vehicle?.plate || "Vehiculo pendiente"} />
            <InfoRow icon={<CalendarDays className="size-4" />} label="Fecha de creacion" value={new Date(quote.created_at).toLocaleDateString("es-VE")} />
            <InfoRow icon={<Send className="size-4" />} label="Enviado" value={quote.sent_at ? new Date(quote.sent_at).toLocaleDateString("es-VE") : "Todavia no"} />
            <InfoRow icon={<ClipboardList className="size-4" />} label="Aprobado" value={quote.approved_at ? new Date(quote.approved_at).toLocaleDateString("es-VE") : "Pendiente"} />
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4">
              <div className="text-sm font-medium text-[var(--foreground)]">Notas</div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {quote.notes || "Sin notas adicionales."}
              </div>
            </div>
            {quote.status === "approved" ? <CreateFromQuoteButton quoteId={quote.id} /> : null}
          </CardContent>
        </Card>

        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen economico</Badge>
            <CardTitle className="text-white">Total limpio y profesional</CardTitle>
            <CardDescription className="text-white/74">
              Lectura rapida del presupuesto para el taller y para el cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow
              label="Mano de obra"
              value={formatCurrencyDisplay(
                laborItems.reduce((total, item) => total + Number(item.line_total ?? 0), 0),
                workshop.preferred_currency,
              )}
            />
            <SummaryRow
              label="Repuestos"
              value={formatCurrencyDisplay(
                partItems.reduce((total, item) => total + Number(item.line_total ?? 0), 0),
                workshop.preferred_currency,
              )}
            />
            <SummaryRow
              label="Subtotal"
              value={formatCurrencyDisplay(quote.subtotal, workshop.preferred_currency)}
            />
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-white/64">Total</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
                {formatCurrencyDisplay(quote.total_amount, workshop.preferred_currency)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ItemsCard
          currency={workshop.preferred_currency}
          emptyText="Todavia no hay items de mano de obra."
          items={laborItems}
          title="Mano de obra"
        />
        <ItemsCard
          currency={workshop.preferred_currency}
          emptyText="Todavia no hay repuestos."
          items={partItems}
          title="Repuestos"
        />
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
        <CardDescription>Lectura clara y separada para que el presupuesto se entienda rapido.</CardDescription>
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
