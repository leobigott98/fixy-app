import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BarChart3, CircleDollarSign, ClipboardCheck, PackageSearch, WalletCards } from "lucide-react";

import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getReportsOverview } from "@/lib/data/reports";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { getRoleLabel, hasModuleAccess } from "@/lib/permissions";
import { formatCurrencyDisplay } from "@/lib/utils";

export default async function ReportsPage() {
  const workshop = await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const role = access?.role ?? "mechanic";
  const canViewReports = hasModuleAccess(role, "reports");

  if (!canViewReports) {
    redirect("/app/dashboard");
  }

  const reports = await getReportsOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Resumen simple del negocio para entender operacion, cobranza e inventario sin abrir un modulo de BI pesado."
        status="Sprint 11"
      />

      <PermissionBanner
        title={`Vista de ${getRoleLabel(role)}`}
        description="Reportes queda reservado para owner, admin y finanzas porque concentra lectura de negocio."
      />

      <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Ordenes activas" value={String(reports.metrics.activeWorkOrders)} icon={<BarChart3 className="size-4" />} />
            <MetricCard label="Ordenes completadas" value={String(reports.metrics.completedWorkOrders)} icon={<ClipboardCheck className="size-4" />} />
            <MetricCard label="Ingresos del mes" value={formatCurrencyDisplay(reports.metrics.revenueThisMonth, workshop.preferred_currency)} icon={<CircleDollarSign className="size-4" />} />
            <MetricCard label="Saldos pendientes" value={formatCurrencyDisplay(reports.metrics.pendingBalances, workshop.preferred_currency)} icon={<WalletCards className="size-4" />} />
            <MetricCard label="Bajo stock" value={String(reports.metrics.lowStockCount)} icon={<PackageSearch className="size-4" />} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="bg-white/86">
              <CardContent className="space-y-4 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                      Embudo operativo
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      Cotizacion, aprobacion y compras en una sola lectura.
                    </div>
                  </div>
                  <Badge variant="primary">Resumen</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Presupuestos pendientes" value={String(reports.funnel.quotesPending)} />
                  <InfoCard label="Presupuestos aprobados" value={String(reports.funnel.quotesApproved)} />
                  <InfoCard label="Compras abiertas" value={String(reports.funnel.purchaseOrdersOpen)} />
                  <InfoCard label="Compras recibidas" value={String(reports.funnel.purchaseOrdersReceived)} />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/86">
              <CardContent className="space-y-4 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                      Cobranza y riesgo
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      Lo suficiente para ver salud financiera sin parecer contabilidad.
                    </div>
                  </div>
                  <Badge variant="success">Cobro</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard label="Ordenes con saldo pendiente" value={String(reports.collections.pendingOrderCount)} />
                  <InfoCard label="Ordenes vencidas" value={String(reports.collections.overdueCount)} />
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                  Estos reportes son intencionalmente ligeros: suficientes para owner/admin hoy, listos para crecer despues con filtros y periodos.
                </div>
              </CardContent>
            </Card>
          </div>
      </>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="bg-white/84">
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[var(--muted)]">{label}</div>
          <div className="text-[var(--primary-strong)]">{icon}</div>
        </div>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
