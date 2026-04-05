import type { Route } from "next";
import Link from "next/link";
import { LayoutGrid, SquarePen, TableProperties, Truck } from "lucide-react";

import { PermissionBanner } from "@/components/shared/permission-banner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSuppliersList, getSupplierEditHref } from "@/lib/data/suppliers";
import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { getRoleLabel, hasPermission } from "@/lib/permissions";
import { getPreferredListView } from "@/lib/view-preferences";

type SuppliersPageProps = {
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

  return `/app/suppliers?${params.toString()}` as Route;
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();
  const role = access?.role ?? "mechanic";
  const canManage = hasPermission(role, "manage_suppliers");
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = await getPreferredListView(getQueryValue(params.view));
  const suppliers = await getSuppliersList(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Base practica para sostener compras e inventario sin armar un modulo corporativo."
        status="Sprint 11"
        action={
          canManage
            ? {
                label: "Nuevo proveedor",
                icon: <Truck className="size-4" />,
                href: "/app/suppliers/new" as Route,
              }
            : undefined
        }
      />

      {!canManage ? (
        <PermissionBanner
          title={`Vista de ${getRoleLabel(role)}`}
          description="Por ahora los mecanicos pueden consultar proveedores, pero la gestion queda visible como placeholder para owner y admin."
          tone="warning"
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <SearchBar
          action={`/app/suppliers?view=${view}`}
          placeholder="Busca por nombre, telefono o nota"
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

      {suppliers.length ? (
        view === "table" ? (
          <Card className="bg-white/88">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Proveedor</th>
                      <th className="px-5 py-4 font-semibold">Telefono</th>
                      <th className="px-5 py-4 font-semibold">Compras</th>
                      <th className="px-5 py-4 font-semibold">Notas</th>
                      <th className="px-5 py-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr className="border-t border-[var(--line)] align-top" key={supplier.id}>
                        <td className="px-5 py-4 font-semibold">{supplier.name}</td>
                        <td className="px-5 py-4">{supplier.phone || "Opcional"}</td>
                        <td className="px-5 py-4">
                          <Badge>{supplier.purchaseOrderCount} compras</Badge>
                        </td>
                        <td className="px-5 py-4">{supplier.notes || "Sin notas"}</td>
                        <td className="px-5 py-4">
                          {canManage ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={getSupplierEditHref(supplier.id)}>
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
            {suppliers.map((supplier) => (
              <Card className="bg-white/86" key={supplier.id}>
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">Proveedor</Badge>
                        <Badge>{supplier.purchaseOrderCount} compras</Badge>
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                          {supplier.name}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">{supplier.phone || "Sin telefono"}</div>
                      </div>
                    </div>
                    {canManage ? (
                      <Button asChild size="icon" variant="outline">
                        <Link href={getSupplierEditHref(supplier.id)}>
                          <SquarePen className="size-4" />
                        </Link>
                      </Button>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                    {supplier.notes || "Sin notas internas para este proveedor."}
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
              <Badge variant="primary">Proveedores vacios</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Empieza tu red de compras
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Carga proveedores clave para responder objeciones de inventario y dejar la base lista para ordenes de compra.
              </p>
              {canManage ? (
                <Button asChild variant="primary">
                  <Link href={"/app/suppliers/new" as Route}>Crear primer proveedor</Link>
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3">
              {[
                "Solo nombre, telefono y notas. Sin burocracia.",
                "Sirve de soporte a compras e inventario.",
                "La base queda lista para crecimiento sin sobreingenieria.",
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
