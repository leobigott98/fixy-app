import type { Route } from "next";
import Link from "next/link";
import { Archive, ClipboardList, FilePlus2, Hourglass, Send, TableProperties, Wrench } from "lucide-react";

import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { QuoteTableActions } from "@/components/quotes/quote-table-actions";
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
    view?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getViewValue(value?: string) {
  return value === "archived" ? "archived" : "active";
}

function buildQuotesViewHref(view: "active" | "archived", query?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  params.set("view", view);

  return `/app/quotes?${params.toString()}` as Route;
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = getViewValue(getQueryValue(params.view));
  const quotes = await getQuotesList(query, view);

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
        action={`/app/quotes?view=${view}`}
        placeholder="Busca por cliente, vehiculo, estado o nota"
        query={query}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[var(--line)] bg-white/80 p-3 shadow-[0_18px_40px_rgba(21,28,35,0.06)]">
        <div className="flex gap-2">
          <Button asChild variant={view === "active" ? "primary" : "outline"}>
            <Link href={buildQuotesViewHref("active", query)}>
              <TableProperties className="size-4" />
              Activos
            </Link>
          </Button>
          <Button asChild variant={view === "archived" ? "primary" : "outline"}>
            <Link href={buildQuotesViewHref("archived", query)}>
              <Archive className="size-4" />
              Archivados
            </Link>
          </Button>
        </div>
        <div className="text-sm text-[var(--muted)]">
          Vista operativa con acciones de editar, archivar y eliminar.
        </div>
      </div>

      {quotes.length ? (
        <>
          <Card className="hidden bg-white/88 lg:block">
            <CardContent className="p-0">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Presupuesto</th>
                    <th className="px-5 py-4 font-semibold">Cliente</th>
                    <th className="px-5 py-4 font-semibold">Estado</th>
                    <th className="px-5 py-4 font-semibold">Fecha</th>
                    <th className="px-5 py-4 font-semibold">Total</th>
                    <th className="px-5 py-4 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr className="border-t border-[var(--line)] align-top" key={quote.id}>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{quote.title}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {quote.vehicle?.vehicle_label || quote.vehicle?.plate || "Vehiculo pendiente"}
                        </div>
                      </td>
                      <td className="px-5 py-4">{quote.client?.full_name || "Cliente pendiente"}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <QuoteStatusBadge status={quote.status} />
                          <Badge>{quote.itemCount} items</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-4">{new Date(quote.created_at).toLocaleDateString("es-VE")}</td>
                      <td className="px-5 py-4 font-semibold">
                        {formatCurrencyDisplay(quote.total_amount, workshop.preferred_currency)}
                      </td>
                      <td className="px-5 py-4">
                        <QuoteTableActions
                          detailHref={getQuoteDetailHref(quote.id)}
                          editHref={getQuoteEditHref(quote.id)}
                          isArchived={Boolean(quote.archived_at)}
                          quoteId={quote.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:hidden">
            {quotes.map((quote) => (
              <Card key={quote.id} className="bg-white/86">
                <CardContent className="space-y-5 px-5 py-5">
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
                        {quote.client?.full_name || "Cliente pendiente"} -{" "}
                        {quote.vehicle?.vehicle_label || quote.vehicle?.plate || "Vehiculo pendiente"}
                      </div>
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

                  <QuoteTableActions
                    detailHref={getQuoteDetailHref(quote.id)}
                    editHref={getQuoteEditHref(quote.id)}
                    isArchived={Boolean(quote.archived_at)}
                    quoteId={quote.id}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="bg-white/86">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Badge variant="primary">{view === "archived" ? "Sin archivados" : "Sin presupuestos"}</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                {view === "archived" ? "Todavia no has archivado presupuestos" : "Tu flujo de cotizacion empieza aqui"}
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                {view === "archived"
                  ? "Archiva presupuestos viejos para mantener la vista activa limpia sin perder historial."
                  : "Crea el primer presupuesto con mano de obra y repuestos separados para cotizar mas rapido y con una lectura mucho mas clara que el software tradicional."}
              </p>
              {view === "active" ? (
                <Button asChild variant="primary">
                  <Link href={"/app/quotes/new" as Route}>Crear primer presupuesto</Link>
                </Button>
              ) : null}
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
