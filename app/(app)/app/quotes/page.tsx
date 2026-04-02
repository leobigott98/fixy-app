import type { Route } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardList, FilePlus2, Hourglass, Send, SquarePen, Wrench } from "lucide-react";

import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getQuoteDetailHref, getQuoteEditHref, getQuotesList } from "@/lib/data/quotes";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

type QuotesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const quotes = await getQuotesList(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuestos"
        description="Cotiza mas rapido con una vista clara, estados visibles y lectura profesional para cliente y taller."
        status="Sprint 3"
        action={{
          label: "Nuevo presupuesto",
          icon: <FilePlus2 className="size-4" />,
          href: "/app/quotes/new" as Route,
        }}
      />

      <SearchBar
        action="/app/quotes"
        placeholder="Busca por cliente, vehiculo, estado o nota"
        query={query}
      />

      {quotes.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {quotes.map((quote) => (
            <Card key={quote.id} className="bg-white/86">
              <CardContent className="space-y-5 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <QuoteStatusBadge status={quote.status} />
                      <Badge>{quote.itemCount} items</Badge>
                    </div>
                    <div>
                      <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                        {quote.title}
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {quote.client?.full_name || "Cliente pendiente"} - {quote.vehicle?.vehicle_label || quote.vehicle?.plate || "Vehiculo pendiente"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="icon" variant="outline">
                      <Link href={getQuoteEditHref(quote.id)}>
                        <SquarePen className="size-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="primary">
                      <Link href={getQuoteDetailHref(quote.id)}>Ver detalle</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                    <div className="text-sm text-[var(--muted)]">Creado</div>
                    <div className="mt-2 text-sm font-medium">
                      {new Date(quote.created_at).toLocaleDateString("es-VE")}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                    <div className="text-sm text-[var(--muted)]">Enviado</div>
                    <div className="mt-2 text-sm font-medium">
                      {quote.sent_at ? new Date(quote.sent_at).toLocaleDateString("es-VE") : "Pendiente"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                    <div className="text-sm text-[var(--muted)]">Total</div>
                    <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                      {formatCurrencyDisplay(quote.total_amount, workshop.preferred_currency)}
                    </div>
                  </div>
                </div>

                {quote.notes ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
                    {quote.notes}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white/86">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Badge variant="primary">Sin presupuestos</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Tu flujo de cotizacion empieza aqui
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Crea el primer presupuesto con mano de obra y repuestos separados para cotizar mas
                rapido y con una lectura mucho mas clara que el software tradicional.
              </p>
              <Button asChild variant="primary">
                <Link href={"/app/quotes/new" as Route}>Crear primer presupuesto</Link>
              </Button>
            </div>
            <div className="grid gap-3">
              {[
                { icon: <ClipboardList className="size-4" />, text: "Items separados entre mano de obra y repuestos." },
                { icon: <Send className="size-4" />, text: "Estados de borrador, enviado, aprobado, rechazado y vencido." },
                { icon: <Hourglass className="size-4" />, text: "Totales claros y listos para el siguiente paso operativo." },
                { icon: <Wrench className="size-4" />, text: "Los aprobados quedan listos para convertirse en orden de trabajo." },
              ].map((item) => (
                <div key={item.text} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                  <div className="text-[var(--primary-strong)]">{item.icon}</div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
