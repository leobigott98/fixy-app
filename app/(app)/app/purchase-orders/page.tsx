import type { Route } from "next";
import Link from "next/link";
import { LayoutGrid, ReceiptText, SquarePen, TableProperties, Truck } from "lucide-react";

import { PurchaseOrderStatusBadge } from "@/components/purchase-orders/purchase-order-status-badge";
import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getPurchaseOrderEditHref,
  getPurchaseOrdersList,
} from "@/lib/data/purchase-orders";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { getRoleLabel, hasPermission } from "@/lib/permissions";
import { formatCurrencyDisplay } from "@/lib/utils";
import { getPreferredListView } from "@/lib/view-preferences";

type PurchaseOrdersPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    view?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildViewHref(view: "cards" | "table", query?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  params.set("view", view);

  return `/app/purchase-orders?${params.toString()}` as Route;
}

export default async function PurchaseOrdersPage({ searchParams }: PurchaseOrdersPageProps) {
  const workshop = await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const role = access?.role ?? "mechanic";
  const canManage = hasPermission(role, "manage_purchase_orders");
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = await getPreferredListView(getQueryValue(params.view));
  const purchaseOrders = await getPurchaseOrdersList(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras"
        description="Ordenes de compra ligeras para sostener reposicion sin convertir Fixy en un ERP pesado."
        status="Sprint 11"
        action={
          canManage
            ? {
                label: "Nueva compra",
                icon: <ReceiptText className="size-4" />,
                href: "/app/purchase-orders/new" as Route,
              }
            : undefined
        }
      />

      {!canManage ? (
        <PermissionBanner
          title={`Vista de ${getRoleLabel(role)}`}
          description="El equipo mecanico ya puede ver compras como referencia operativa. La gestion queda visible para owner y admin."
          tone="warning"
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <SearchBar
          action={`/app/purchase-orders?view=${view}`}
          placeholder="Busca por codigo, proveedor, estado o nota"
          query={query}
        />
        <ViewToggle
          options={[
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
      </div>

      {purchaseOrders.length ? (
        view === "table" ? (
          <Card className="bg-white/88">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Orden</th>
                      <th className="px-5 py-4 font-semibold">Proveedor</th>
                      <th className="px-5 py-4 font-semibold">Estado</th>
                      <th className="px-5 py-4 font-semibold">Fecha</th>
                      <th className="px-5 py-4 font-semibold">Items</th>
                      <th className="px-5 py-4 font-semibold">Monto</th>
                      <th className="px-5 py-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((purchaseOrder) => (
                      <tr className="border-t border-[var(--line)] align-top" key={purchaseOrder.id}>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{purchaseOrder.code || "Sin codigo"}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{purchaseOrder.notes || "Sin notas"}</div>
                        </td>
                        <td className="px-5 py-4">{purchaseOrder.supplier?.name || "Proveedor pendiente"}</td>
                        <td className="px-5 py-4">
                          <PurchaseOrderStatusBadge status={purchaseOrder.status} />
                        </td>
                        <td className="px-5 py-4">{new Date(purchaseOrder.ordered_at).toLocaleDateString("es-VE")}</td>
                        <td className="px-5 py-4">{purchaseOrder.itemCount}</td>
                        <td className="px-5 py-4 font-semibold">
                          {formatCurrencyDisplay(purchaseOrder.total_amount, workshop.preferred_currency)}
                        </td>
                        <td className="px-5 py-4">
                          {canManage ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={getPurchaseOrderEditHref(purchaseOrder.id)}>
                                <SquarePen className="size-4" />
                                Editar
                              </Link>
                            </Button>
                          ) : (
                            <div className="text-xs text-[var(--muted)]">Solo lectura</div>
                          )}
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
            {purchaseOrders.map((purchaseOrder) => (
              <Card className="bg-white/86" key={purchaseOrder.id}>
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <PurchaseOrderStatusBadge status={purchaseOrder.status} />
                        <Badge>{purchaseOrder.itemCount} items</Badge>
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                          {purchaseOrder.code || "Orden de compra"}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {purchaseOrder.supplier?.name || "Proveedor pendiente"}
                        </div>
                      </div>
                    </div>
                    {canManage ? (
                      <Button asChild size="icon" variant="outline">
                        <Link href={getPurchaseOrderEditHref(purchaseOrder.id)}>
                          <SquarePen className="size-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoCard label="Fecha" value={new Date(purchaseOrder.ordered_at).toLocaleDateString("es-VE")} />
                    <InfoCard label="Items" value={String(purchaseOrder.itemCount)} />
                    <InfoCard
                      label="Monto"
                      value={formatCurrencyDisplay(purchaseOrder.total_amount, workshop.preferred_currency)}
                      strong
                    />
                  </div>

                  <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                    {purchaseOrder.notes || "Sin notas para esta compra."}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="bg-white/86">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Badge variant="primary">Compras vacias</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Crea tu primer registro de compra
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Esto deja resuelta la base comercial frente a inventario y proveedores sin meter complejidad empresarial.
              </p>
              {canManage ? (
                <Button asChild variant="primary">
                  <Link href={"/app/purchase-orders/new" as Route}>Crear primera compra</Link>
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3">
              {[
                "Proveedor, items, monto, fecha y estado.",
                "Base limpia para crecer a compras mas ricas despues.",
                "Mantiene a Fixy competitivo sin sobrecargar operaciones.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                  <Truck className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
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

function InfoCard({
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
