import type { Route } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Receipt, Wallet } from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PaymentStatusBadge } from "@/components/finances/payment-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getFinanceExpenseNewHref,
  getFinancePaymentNewHref,
  getFinancesOverview,
  getPaymentReceiptHref,
} from "@/lib/data/finances";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { getExpenseCategoryLabel, getPaymentMethodLabel } from "@/lib/finances/constants";
import { formatCurrencyDisplay } from "@/lib/utils";

type FinancesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FinancesPage({ searchParams }: FinancesPageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const data = await getFinancesOverview(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas"
        description="Visibilidad simple y confiable para saber cuanto entro, cuanto falta cobrar y cuanto salio del taller."
        status="Sprint 5"
        action={{
          label: "Registrar pago",
          icon: <Wallet className="size-4" />,
          href: getFinancePaymentNewHref(),
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="primary">
          <Link href={getFinancePaymentNewHref()}>
            <Wallet className="size-4" />
            Registrar pago
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={getFinanceExpenseNewHref()}>
            <Receipt className="size-4" />
            Registrar gasto
          </Link>
        </Button>
      </div>

      <SearchBar
        action="/app/finances"
        placeholder="Busca por cliente, orden, categoria, metodo o nota"
        query={query}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          helper={`Entradas confirmadas este mes en ${workshop.preferred_currency}.`}
          label="Cobrado este mes"
          tone="success"
          value={formatCurrencyDisplay(data.overview.collectedThisMonth, workshop.preferred_currency)}
        />
        <KpiCard
          helper="Saldo todavia pendiente entre ordenes abiertas y listas."
          label="Saldo pendiente"
          tone="primary"
          value={formatCurrencyDisplay(data.overview.pendingBalances, workshop.preferred_currency)}
        />
        <KpiCard
          helper="Monto pendiente en ordenes con fecha vencida."
          label="Vencido por cobrar"
          tone="primary"
          value={formatCurrencyDisplay(data.overview.overduePayments, workshop.preferred_currency)}
        />
        <KpiCard
          helper="Gastos cargados dentro del mes actual."
          label="Gastos del mes"
          value={formatCurrencyDisplay(data.overview.expensesThisMonth, workshop.preferred_currency)}
        />
        <KpiCard
          helper="Cobrado menos gastos, como lectura rapida del mes."
          label="Neto estimado"
          tone={data.overview.netEstimate >= 0 ? "success" : "default"}
          value={formatCurrencyDisplay(data.overview.netEstimate, workshop.preferred_currency)}
        />
      </div>

      <Card className="bg-white/86">
        <CardHeader>
          <CardTitle>Saldos pendientes por orden</CardTitle>
          <CardDescription>
            Lo justo para saber que falta cobrar y cuales ordenes ya estan comprometidas por fecha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pendingBalances.length ? (
            data.pendingBalances.slice(0, 8).map((item) => (
              <div
                key={item.workOrder.id}
                className="flex flex-col gap-4 rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.isOverdue ? <Badge variant="primary">Vencida</Badge> : <Badge>Por cobrar</Badge>}
                    {item.workOrder.code ? <Badge>{item.workOrder.code}</Badge> : null}
                  </div>
                  <div>
                    <Link
                      className="font-semibold hover:text-[var(--primary-strong)]"
                      href={`/app/work-orders/${item.workOrder.id}` as Route}
                    >
                      {item.workOrder.title}
                    </Link>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {item.client?.full_name || "Cliente pendiente"} -{" "}
                      {item.workOrder.vehicle_label || "Vehiculo pendiente"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[460px]">
                  <MetricBlock
                    label="Cobrado"
                    value={formatCurrencyDisplay(item.collectedAmount, workshop.preferred_currency)}
                  />
                  <MetricBlock
                    label="Pendiente"
                    value={formatCurrencyDisplay(item.pendingBalance, workshop.preferred_currency)}
                  />
                  <MetricBlock
                    label="Promesa"
                    value={item.workOrder.promised_date || "Sin fecha"}
                  />
                </div>
              </div>
            ))
          ) : (
            <EmptyMessage text="No hay saldos pendientes con los filtros actuales." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-white/86">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Historial de pagos</CardTitle>
              <CardDescription>
                Ultimos movimientos de cobro con estado y metodo visibles.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={getFinancePaymentNewHref()}>
                <ArrowUpRight className="size-4" />
                Nuevo pago
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.paymentHistory.length ? (
              data.paymentHistory.slice(0, 10).map((item) => (
                <div
                  key={item.payment.id}
                  className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <PaymentStatusBadge status={item.payment.status} />
                    <Badge>{getPaymentMethodLabel(item.payment.method)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold">
                        {item.client?.full_name || "Cliente sin nombre"}
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {item.workOrder ? item.workOrder.title : "Pago sin orden vinculada"}
                      </div>
                      {item.payment.notes ? (
                        <div className="mt-2 text-sm text-[var(--muted)]">{item.payment.notes}</div>
                      ) : null}
                      {item.payment.proof_url ? (
                        <div className="mt-2 flex flex-wrap gap-3">
                          <a
                            className="inline-flex text-sm font-medium text-[var(--primary-strong)] underline-offset-4 hover:underline"
                            href={item.payment.proof_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Ver comprobante
                          </a>
                          <Link
                            className="inline-flex text-sm font-medium text-[var(--primary-strong)] underline-offset-4 hover:underline"
                            href={getPaymentReceiptHref(item.payment.id)}
                          >
                            Recibo PDF
                          </Link>
                        </div>
                      ) : (
                        <Link
                          className="mt-2 inline-flex text-sm font-medium text-[var(--primary-strong)] underline-offset-4 hover:underline"
                          href={getPaymentReceiptHref(item.payment.id)}
                        >
                          Recibo PDF
                        </Link>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                        {formatCurrencyDisplay(item.payment.amount, workshop.preferred_currency)}
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {new Date(item.payment.paid_at).toLocaleDateString("es-VE")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyMessage text="Todavia no hay pagos registrados con los filtros actuales." />
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Gastos</CardTitle>
              <CardDescription>
                Salidas del taller agrupadas de forma simple y legible.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={getFinanceExpenseNewHref()}>
                <ArrowDownRight className="size-4" />
                Nuevo gasto
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.expenses.length ? (
              data.expenses.slice(0, 10).map((item) => (
                <div
                  key={item.expense.id}
                  className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="primary">{getExpenseCategoryLabel(item.expense.category)}</Badge>
                    {item.workOrder ? <Badge>{item.workOrder.code || "Orden"}</Badge> : null}
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold">
                        {item.workOrder ? item.workOrder.title : "Gasto general del taller"}
                      </div>
                      {item.expense.notes ? (
                        <div className="mt-2 text-sm text-[var(--muted)]">{item.expense.notes}</div>
                      ) : null}
                      {item.assets.length ? (
                        <div className="mt-2 flex flex-wrap gap-3">
                          {item.assets.map((asset, index) => (
                            <a
                              key={asset.id}
                              className="inline-flex text-sm font-medium text-[var(--primary-strong)] underline-offset-4 hover:underline"
                              href={asset.asset_url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Soporte {index + 1}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                        {formatCurrencyDisplay(item.expense.amount, workshop.preferred_currency)}
                      </div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {new Date(item.expense.spent_at).toLocaleDateString("es-VE")}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyMessage text="Todavia no hay gastos registrados con los filtros actuales." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
      {text}
    </div>
  );
}
