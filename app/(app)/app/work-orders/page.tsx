import type { Route } from "next";
import Link from "next/link";
import { CalendarDays, CarFront, Columns3, FilePlus2, LayoutGrid, SquarePen, TableProperties, UserRound, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { ViewToggle } from "@/components/shared/view-toggle";
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
import { getPreferredWorkOrdersView } from "@/lib/view-preferences";

type WorkOrdersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    view?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildViewHref(view: "board" | "cards" | "table", query?: string) {
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
  const view = await getPreferredWorkOrdersView(getQueryValue(params.view));

  const boardData = view === "board" ? await getWorkOrdersBoardData(query) : null;
  const workOrders = view === "board" ? await getWorkOrdersList(query) : await getWorkOrdersList(query);
  const visibleOrders =
    view === "board" && boardData
      ? boardData.orderedStatuses.flatMap((status) => boardData.grouped[status])
      : workOrders;
  const totalOrders = visibleOrders.length;
  const assignedOrders = visibleOrders.filter((order) => order.assignedMechanicName).length;
  const readyOrders = visibleOrders.filter((order) => order.status === "listo_para_entrega").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordenes de trabajo"
        description="Board visual para mover el taller rapido, entender carga activa y seguir cada vehiculo sin perder contexto."
        status="Sprint 4"
        action={{
          label: "Nueva Orden",
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
        <div className="flex flex-col gap-3 xl:items-end">
          <ViewToggle
            options={[
              {
                href: buildViewHref("board", query),
                label: "Kanban",
                icon: <Columns3 className="size-4" />,
                active: view === "board",
              },
              {
                href: buildViewHref("cards", query),
                label: "Cards",
                icon: <LayoutGrid className="size-4" />,
                active: view === "cards",
              },
              {
                href: buildViewHref("table", query),
                label: "Tabla",
                icon: <TableProperties className="size-4" />,
                active: view === "table",
              },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="primary">
              <Link href={"/app/work-orders/new" as Route}>
                <FilePlus2 className="size-4" />
                Nueva Orden
              </Link>
            </Button>
            <div className="rounded-full bg-[rgba(249,115,22,0.1)] px-4 py-3 text-xs font-semibold text-[var(--primary-strong)]">
              No necesitas presupuesto primero
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ordenes visibles" value={String(totalOrders)} />
        <MetricCard label="Con responsable" value={String(assignedOrders)} />
        <MetricCard label="Listas para entrega" value={String(readyOrders)} />
        <MetricCard
          label="Vista activa"
          value={view === "board" ? "Kanban" : view === "cards" ? "Cards" : "Tabla"}
        />
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
        ) : view === "table" ? (
          <Card className="bg-white/88">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Orden</th>
                      <th className="px-5 py-4 font-semibold">Cliente</th>
                      <th className="px-5 py-4 font-semibold">Vehiculo</th>
                      <th className="px-5 py-4 font-semibold">Etapa</th>
                      <th className="px-5 py-4 font-semibold">Responsable</th>
                      <th className="px-5 py-4 font-semibold">Promesa</th>
                      <th className="px-5 py-4 font-semibold">Total</th>
                      <th className="px-5 py-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrders.map((workOrder) => (
                      <tr className="border-t border-[var(--line)] align-top" key={workOrder.id}>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{workOrder.title}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{workOrder.code || "Sin codigo"}</div>
                        </td>
                        <td className="px-5 py-4">{workOrder.client?.full_name || "Cliente pendiente"}</td>
                        <td className="px-5 py-4">{workOrder.vehicle?.vehicle_label || workOrder.vehicle?.plate || "Vehiculo pendiente"}</td>
                        <td className="px-5 py-4">
                          <WorkOrderStatusBadge status={workOrder.status} />
                        </td>
                        <td className="px-5 py-4">{workOrder.assignedMechanicName || "Sin responsable"}</td>
                        <td className="px-5 py-4">{workOrder.promised_date || "Sin fecha"}</td>
                        <td className="px-5 py-4 font-semibold">
                          {formatCurrencyDisplay(workOrder.total_amount, workshop.preferred_currency)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={getWorkOrderEditHref(workOrder.id)}>
                                <SquarePen className="size-4" />
                                Editar
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="primary">
                              <Link href={getWorkOrderDetailHref(workOrder.id)}>Ver detalle</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {workOrders.map((workOrder) => (
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
                "Tambien puedes revisar ordenes en cards o tabla segun el momento.",
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
        <BoardInfo icon={<Wrench className="size-4" />} value={workOrder.assignedMechanicName || "Sin responsable"} />
        <BoardInfo icon={<CalendarDays className="size-4" />} value={workOrder.promised_date || "Sin promesa"} />
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
