import type { Route } from "next";
import Link from "next/link";
import { Boxes, LayoutGrid, PackagePlus, SquarePen, TableProperties, TriangleAlert } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getInventoryEditHref,
  getInventoryList,
  isLowStockItem,
} from "@/lib/data/inventory";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { formatCurrencyDisplay } from "@/lib/utils";
import { getPreferredListView } from "@/lib/view-preferences";

type InventoryPageProps = {
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

  return `/app/inventory?${params.toString()}` as Route;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = await getPreferredListView(getQueryValue(params.view));
  const items = await getInventoryList(query);
  const lowStockCount = items.filter((item) => item.lowStock).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Repuestos claros, stock visible y conexion directa con presupuestos y ordenes del taller."
        status="Sprint 8"
        action={{
          label: "Nuevo repuesto",
          icon: <PackagePlus className="size-4" />,
          href: "/app/inventory/new" as Route,
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <SearchBar
          action={`/app/inventory?view=${view}`}
          placeholder="Busca por nombre, SKU o descripcion"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Items" value={String(items.length)} />
        <Metric label="Bajo stock" value={String(lowStockCount)} tone={lowStockCount ? "warning" : "default"} />
        <Metric label="Cotizados" value={String(items.reduce((total, item) => total + item.quoteUsageCount, 0))} />
        <Metric label="Usados en ordenes" value={String(items.reduce((total, item) => total + item.workOrderUsageCount, 0))} />
      </div>

      {items.length ? (
        view === "table" ? (
          <Card className="bg-white/88">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Repuesto</th>
                      <th className="px-5 py-4 font-semibold">SKU</th>
                      <th className="px-5 py-4 font-semibold">Stock</th>
                      <th className="px-5 py-4 font-semibold">Minimo</th>
                      <th className="px-5 py-4 font-semibold">Costo</th>
                      <th className="px-5 py-4 font-semibold">Precio ref.</th>
                      <th className="px-5 py-4 font-semibold">Uso</th>
                      <th className="px-5 py-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr className="border-t border-[var(--line)] align-top" key={item.id}>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{item.name}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{item.description || "Sin descripcion"}</div>
                        </td>
                        <td className="px-5 py-4">{item.sku || "Opcional"}</td>
                        <td className="px-5 py-4">
                          <Badge variant={item.lowStock ? "default" : "success"}>{item.stock_quantity}</Badge>
                        </td>
                        <td className="px-5 py-4">{item.low_stock_threshold}</td>
                        <td className="px-5 py-4">{formatCurrencyDisplay(item.cost, "USD")}</td>
                        <td className="px-5 py-4">{formatCurrencyDisplay(item.reference_sale_price, "USD")}</td>
                        <td className="px-5 py-4">
                          {item.quoteUsageCount} cot. · {item.workOrderUsageCount} ord.
                        </td>
                        <td className="px-5 py-4">
                          <Button asChild size="sm" variant="outline">
                            <Link href={getInventoryEditHref(item.id)}>
                              <SquarePen className="size-4" />
                              Editar
                            </Link>
                          </Button>
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
            {items.map((item) => (
              <Card key={item.id} className="bg-white/86">
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.lowStock ? "default" : "primary"}>
                          {item.lowStock ? "Bajo stock" : "Disponible"}
                        </Badge>
                        {item.sku ? <Badge>{item.sku}</Badge> : null}
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {item.description || "Sin descripcion"}
                        </div>
                      </div>
                    </div>
                    <Button asChild size="icon" variant="outline">
                      <Link href={getInventoryEditHref(item.id)}>
                        <SquarePen className="size-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <InfoCard label="Stock" value={String(item.stock_quantity)} />
                    <InfoCard label="Minimo" value={String(item.low_stock_threshold)} />
                    <InfoCard label="Precio ref." value={formatCurrencyDisplay(item.reference_sale_price, "USD")} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <UsageCard label="Presupuestos" value={String(item.quoteUsageCount)} />
                    <UsageCard label="Ordenes" value={String(item.workOrderUsageCount)} />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm">
                    <span className="text-[var(--muted)]">Costo</span>
                    <span className="font-medium">{formatCurrencyDisplay(item.cost, "USD")}</span>
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
              <Badge variant="primary">Inventario vacio</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Todavia no hay repuestos cargados
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Carga tu primera pieza para reutilizarla en presupuestos y ordenes sin inventario pesado.
              </p>
              <Button asChild variant="primary">
                <Link href={"/app/inventory/new" as Route}>Crear primer repuesto</Link>
              </Button>
            </div>
            <div className="grid gap-3">
              {[
                "El inventario puede quedarse simple y aun asi ser util para el taller.",
                "Los repuestos se pueden seleccionar directo en cotizaciones y ordenes.",
                "Al completar ordenes, el stock se ajusta automaticamente.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                  <Boxes className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
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

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className="bg-white/84">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[var(--muted)]">{label}</div>
          {tone === "warning" ? <TriangleAlert className="size-4 text-[var(--primary-strong)]" /> : null}
        </div>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {value}
        </div>
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

function UsageCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  );
}
