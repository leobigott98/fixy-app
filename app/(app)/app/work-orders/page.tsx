import type { Route } from "next";
import Link from "next/link";
import { CalendarDays, CarFront, Columns3, FilePlus2, List, SquarePen, UserRound, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { WorkOrderStatusBadge } from "@/components/work-orders/work-order-status-badge";
import { WorkOrderStatusControl } from "@/components/work-orders/work-order-status-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getWorkOrderDetailHref,
  getWorkOrderEditHref,
  getWorkOrdersBoardData,
  getWorkOrdersList,
  getWorkOrderStatusLabel,
  type WorkOrderListItem,
  type WorkOrderRecord,
} from "@/lib/data/work-orders";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";

type WorkOrdersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    view?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getViewValue(value?: string) {
  return value === "list" ? "list" : "board";
}

function buildViewHref(view: "board" | "list", query?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  params.set("view", view);

  return `/app/work-orders?${params.toString()}` as Route;
}

function getBoardColumnDescription(status: WorkOrderRecord["status"]) {
  switch (status) {
    case "presupuesto_pendiente":
      return "Ordenes aprobadas que aun esperan arranque operativo.";
    case "diagnostico_pendiente":
      return "Vehiculos por revisar antes de confirmar trabajo real.";
    case "en_reparacion":
      return "Trabajo activo dentro del taller.";
    case "listo_para_entrega":
      return "Ordenes terminadas, listas para cobrar y entregar.";
    case "completada":
      return "Historial reciente de trabajos cerrados.";
    case "cancelada":
      return "Ordenes detenidas o anuladas.";
    default:
      return "Etapa operativa de la orden.";
  }
}

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = getViewValue(getQueryValue(params.view));

  const boardData = view === "board" ? await getWorkOrdersBoardData(query) : null;
  const workOrders = view === "list" ? await getWorkOrdersList(query) : null;
  const visibleOrders =
    view === "board" && boardData
      ? boardData.orderedStatuses.flatMap((status) => boardData.grouped[status])
      : workOrders ?? [];
  const totalOrders =
    view === "board"
      ? boardData?.orderedStatuses.reduce(
          (total, status) => total + (boardData.grouped[status]?.length ?? 0),
          0,
        ) ?? 0
      : workOrders?.length ?? 0;
  const assignedOrders = visibleOrders.filter((order) => order.assignedMechanicName).length;
  const readyOrders = visibleOrders.filter((order) => order.status === "listo_para_entrega").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordenes de trabajo"
        description="Board visual para mover el taller rapido, entender carga activa y seguir cada vehiculo sin perder contexto."
        status="Sprint 4"
        action={{
          label: "Nueva orden",
          icon: <FilePlus2 className="size-4" />,
          href: "/app/work-orders/new" as Route,
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <SearchBar
          action={`/app/work-orders?view=${view}`}
          placeholder="Busca por codigo, cliente, vehiculo, responsable o nota"
          query={query}
        />
        <div className="flex gap-2 rounded-[28px] border border-[var(--line)] bg-white/76 p-2 shadow-[0_18px_40px_rgba(21,28,35,0.06)]">
          <Button asChild variant={view === "board" ? "primary" : "outline"}>
            <Link href={buildViewHref("board", query)}>
              <Columns3 className="size-4" />
              Board
            </Link>
          </Button>
          <Button asChild variant={view === "list" ? "primary" : "outline"}>
            <Link href={buildViewHref("list", query)}>
              <List className="size-4" />
              Lista
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ordenes visibles" value={String(totalOrders)} />
        <MetricCard label="Con responsable" value={String(assignedOrders)} />
        <MetricCard label="Listas para entrega" value={String(readyOrders)} />
        <MetricCard label="Vista activa" value={view === "board" ? "Board" : "Lista"} />
      </div>

      {totalOrders ? (
        view === "board" && boardData ? (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {boardData.orderedStatuses.map((status) => (
                <Card key={status} className="w-[300px] shrink-0 bg-white/86">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <WorkOrderStatusBadge status={status} />
                      <Badge>{boardData.grouped[status].length}</Badge>
                    </div>
                    <CardTitle>{getWorkOrderStatusLabel(status)}</CardTitle>
                    <CardDescription>{getBoardColumnDescription(status)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {boardData.grouped[status].length ? (
                      boardData.grouped[status].map((workOrder) => (
                        <BoardCard
                          currency={workshop.preferred_currency}
                          key={workOrder.id}
                          workOrder={workOrder}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                        No hay ordenes en esta etapa todavia.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {workOrders?.map((workOrder) => (
              <ListCard
                currency={workshop.preferred_currency}
                key={workOrder.id}
                workOrder={workOrder}
              />
            ))}
          </div>
        )
      ) : (
        <Card className="bg-white/86">
          <CardContent className="grid gap-4 p-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <Badge variant="primary">Flujo visual</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                El board del taller empieza aqui
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Crea tu primera orden manualmente o conviertela desde un presupuesto aprobado. El
                objetivo es ver rapido que entra, que esta en reparacion y que ya se puede entregar.
              </p>
              <Button asChild variant="primary">
                <Link href={"/app/work-orders/new" as Route}>Crear primera orden</Link>
              </Button>
            </div>
            <div className="grid gap-3">
              {[
                "Cada etapa se lee directo desde el board, sin tablas pesadas.",
                "Mover la orden entre estados toma un par de toques.",
                "Servicios y repuestos quedan dentro del mismo flujo.",
                "Los presupuestos aprobados ya se pueden convertir en orden.",
              ].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6"
                >
                  <Wrench className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
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

function BoardCard({
  workOrder,
  currency,
}: {
  workOrder: WorkOrderListItem;
  currency: "USD" | "VES" | "USD_VES";
}) {
  return (
    <div className="space-y-4 rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge>{workOrder.code || "Sin codigo"}</Badge>
          <Link
            className="block font-semibold leading-6 hover:text-[var(--primary-strong)]"
            href={getWorkOrderDetailHref(workOrder.id)}
          >
            {workOrder.title}
          </Link>
        </div>
        <Button asChild size="icon" variant="ghost">
          <Link href={getWorkOrderEditHref(workOrder.id)}>
            <SquarePen className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-2 text-sm text-[var(--muted)]">
        <BoardInfo icon={<UserRound className="size-4" />} value={workOrder.client?.full_name || "Cliente pendiente"} />
        <BoardInfo icon={<CarFront className="size-4" />} value={workOrder.vehicle?.vehicle_label || workOrder.vehicle?.plate || "Vehiculo pendiente"} />
        <BoardInfo
          icon={<Wrench className="size-4" />}
          value={workOrder.assignedMechanicName || "Sin responsable"}
        />
        <BoardInfo
          icon={<CalendarDays className="size-4" />}
          value={workOrder.promised_date || "Sin promesa"}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge>{workOrder.serviceCount} servicios</Badge>
        <Badge>{workOrder.partCount} repuestos</Badge>
      </div>

      <div className="rounded-2xl bg-white/80 p-4">
        <div className="text-sm text-[var(--muted)]">Total</div>
        <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {formatCurrencyDisplay(workOrder.total_amount, currency)}
        </div>
      </div>

      <WorkOrderStatusControl compact currentStatus={workOrder.status} workOrderId={workOrder.id} />
    </div>
  );
}

function ListCard({
  workOrder,
  currency,
}: {
  workOrder: WorkOrderListItem;
  currency: "USD" | "VES" | "USD_VES";
}) {
  return (
    <Card className="bg-white/86">
      <CardContent className="space-y-5 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <WorkOrderStatusBadge status={workOrder.status} />
              <Badge>{workOrder.code || "Sin codigo"}</Badge>
            </div>
            <div>
              <Link
                className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight hover:text-[var(--primary-strong)]"
                href={getWorkOrderDetailHref(workOrder.id)}
              >
                {workOrder.title}
              </Link>
              <div className="mt-1 text-sm text-[var(--muted)]">
                {workOrder.client?.full_name || "Cliente pendiente"} -{" "}
                {workOrder.vehicle?.vehicle_label || workOrder.vehicle?.plate || "Vehiculo pendiente"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="icon" variant="outline">
              <Link href={getWorkOrderEditHref(workOrder.id)}>
                <SquarePen className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link href={getWorkOrderDetailHref(workOrder.id)}>Ver detalle</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoMetric label="Responsable" value={workOrder.assignedMechanicName || "Sin asignar"} />
          <InfoMetric label="Promesa" value={workOrder.promised_date || "Sin fecha"} />
          <InfoMetric
            label="Total"
            value={formatCurrencyDisplay(workOrder.total_amount, currency)}
            strong
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge>{workOrder.serviceCount} servicios</Badge>
          <Badge>{workOrder.partCount} repuestos</Badge>
          {workOrder.quote ? <Badge>Desde presupuesto</Badge> : null}
        </div>

        {workOrder.notes ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm leading-6 text-[var(--muted)]">
            {workOrder.notes}
          </div>
        ) : null}

        <WorkOrderStatusControl currentStatus={workOrder.status} workOrderId={workOrder.id} />
      </CardContent>
    </Card>
  );
}

function BoardInfo({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[var(--primary-strong)]">{icon}</div>
      <span>{value}</span>
    </div>
  );
}

function InfoMetric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div
        className={
          strong
            ? "mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight"
            : "mt-2 text-sm font-medium"
        }
      >
        {value}
      </div>
    </div>
  );
}
