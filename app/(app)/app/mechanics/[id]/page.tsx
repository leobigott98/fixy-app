import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, Phone, UserRound, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMechanicDetail, getMechanicEditHref } from "@/lib/data/mechanics";
import { getMechanicRoleLabel } from "@/lib/mechanics/constants";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { getWorkOrderStatusLabel } from "@/lib/data/work-orders";
import { formatCurrencyDisplay } from "@/lib/utils";

type MechanicDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MechanicDetailPage({ params }: MechanicDetailPageProps) {
  const workshop = await requireCurrentWorkshop();
  const { id } = await params;
  const detail = await getMechanicDetail(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.mechanic.full_name}
        description="Carga visible, ordenes asignadas y contexto rapido del integrante."
        status={detail.mechanic.is_active ? "Activo" : "Inactivo"}
        action={{
          label: "Editar integrante",
          icon: <ArrowUpRight className="size-4" />,
          href: getMechanicEditHref(detail.mechanic.id),
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Activas" value={String(detail.assignedActiveOrders.length)} />
        <Metric label="Completadas" value={String(detail.assignedCompletedOrders.length)} />
        <Metric label="Rol" value={getMechanicRoleLabel(detail.mechanic.role)} />
        <Metric label="Estado" value={detail.mechanic.is_active ? "Activo" : "Inactivo"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>Perfil del integrante</CardTitle>
            <CardDescription>
              Informacion justa para asignar y operar el taller mejor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {detail.mechanic.photo_url ? (
                <img
                  alt={detail.mechanic.full_name}
                  className="size-20 rounded-[24px] object-cover"
                  src={detail.mechanic.photo_url}
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-[24px] bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                  <UserRound className="size-8" />
                </div>
              )}
              <div>
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  {detail.mechanic.full_name}
                </div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {getMechanicRoleLabel(detail.mechanic.role)}
                </div>
              </div>
            </div>

            <InfoRow icon={<Phone className="size-4" />} label="Telefono" value={detail.mechanic.phone || "Opcional"} />
            <InfoRow icon={<Wrench className="size-4" />} label="Estado" value={detail.mechanic.is_active ? "Disponible para asignacion" : "Inactivo"} />
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4">
              <div className="text-sm font-medium text-[var(--foreground)]">Notas</div>
              <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {detail.mechanic.notes || "Sin notas adicionales."}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Carga actual</Badge>
            <CardTitle className="text-white">Visibilidad de trabajo</CardTitle>
            <CardDescription className="text-white/74">
              Cuanto tiene encima y que ya logro cerrar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Ordenes activas" value={String(detail.assignedActiveOrders.length)} />
            <SummaryRow label="Ordenes completadas" value={String(detail.assignedCompletedOrders.length)} />
            <SummaryRow label="Capacidad" value={detail.assignedActiveOrders.length >= 5 ? "Alta" : "Manejable"} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OrdersCard
          currency={workshop.preferred_currency}
          emptyText="Todavia no tiene ordenes activas asignadas."
          orders={detail.assignedActiveOrders}
          title="Ordenes activas"
        />
        <OrdersCard
          currency={workshop.preferred_currency}
          emptyText="Todavia no tiene ordenes completadas."
          orders={detail.assignedCompletedOrders}
          title="Ordenes completadas"
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
  icon: React.ReactNode;
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/8 p-4">
      <div className="text-sm text-white/72">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function OrdersCard({
  title,
  orders,
  emptyText,
  currency,
}: {
  title: string;
  orders: Array<{
    id: string;
    code: string | null;
    title: string;
    status: string;
    total_amount: number | string | null;
    promised_date: string | null;
    vehicle_label: string | null;
  }>;
  emptyText: string;
  currency: "USD" | "VES" | "USD_VES";
}) {
  return (
    <Card className="bg-white/86">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Lectura simple del trabajo asignado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.length ? (
          orders.map((order) => (
            <div key={order.id} className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                {order.code ? <Badge>{order.code}</Badge> : null}
                <Badge variant="primary">{getWorkOrderStatusLabel(order.status as never)}</Badge>
              </div>
              <div className="mt-3 font-semibold">{order.title}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                {(order.vehicle_label || "Vehiculo pendiente") + " · " + (order.promised_date || "Sin fecha")}
              </div>
              <div className="mt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/app/work-orders/${order.id}` as Route}>
                    <ClipboardList className="size-4" />
                    {formatCurrencyDisplay(Number(order.total_amount ?? 0), currency)}
                  </Link>
                </Button>
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
