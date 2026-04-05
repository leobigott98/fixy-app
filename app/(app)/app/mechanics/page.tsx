import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, SquarePen, TableProperties, UserPlus, UserRound, UsersRound, Wrench } from "lucide-react";

import { getCurrentWorkshopAccess, requireCurrentWorkshop } from "@/lib/data/workshops";
import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMechanicDetailHref, getMechanicEditHref, getMechanicsList } from "@/lib/data/mechanics";
import { getMechanicRoleLabel } from "@/lib/mechanics/constants";
import { hasModuleAccess } from "@/lib/permissions";
import { getPreferredListView } from "@/lib/view-preferences";

type MechanicsPageProps = {
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

  return `/app/mechanics?${params.toString()}` as Route;
}

export default async function MechanicsPage({ searchParams }: MechanicsPageProps) {
  await requireCurrentWorkshop();
  const access = await getCurrentWorkshopAccess();

  if (!hasModuleAccess(access?.role ?? "mechanic", "mechanics")) {
    redirect("/app/dashboard");
  }

  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = await getPreferredListView(getQueryValue(params.view));
  const mechanics = await getMechanicsList(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo"
        description="Visibilidad ligera del equipo para asignar ordenes y medir carga sin convertirlo en RRHH."
        status="Sprint 6"
        action={{
          label: "Agregar integrante",
          icon: <UserPlus className="size-4" />,
          href: "/app/mechanics/new" as Route,
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <SearchBar
          action={`/app/mechanics?view=${view}`}
          placeholder="Busca por nombre, telefono o rol"
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

      {mechanics.length ? (
        view === "table" ? (
          <Card className="bg-white/88">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Integrante</th>
                      <th className="px-5 py-4 font-semibold">Rol</th>
                      <th className="px-5 py-4 font-semibold">Telefono</th>
                      <th className="px-5 py-4 font-semibold">Estado</th>
                      <th className="px-5 py-4 font-semibold">Activas</th>
                      <th className="px-5 py-4 font-semibold">Completadas</th>
                      <th className="px-5 py-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mechanics.map((mechanic) => (
                      <tr className="border-t border-[var(--line)] align-top" key={mechanic.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {mechanic.photo_url ? (
                              <img alt={mechanic.full_name} className="size-12 rounded-2xl object-cover" src={mechanic.photo_url} />
                            ) : (
                              <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                                <UserRound className="size-5" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold">{mechanic.full_name}</div>
                              <div className="mt-1 text-xs text-[var(--muted)]">{mechanic.currentOrders[0]?.title || "Sin orden activa"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">{getMechanicRoleLabel(mechanic.role)}</td>
                        <td className="px-5 py-4">{mechanic.phone || "Opcional"}</td>
                        <td className="px-5 py-4">
                          <Badge variant={mechanic.is_active ? "success" : "default"}>
                            {mechanic.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">{mechanic.assignedActiveOrders}</td>
                        <td className="px-5 py-4">{mechanic.assignedCompletedOrders}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={getMechanicEditHref(mechanic.id)}>
                                <SquarePen className="size-4" />
                                Editar
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="primary">
                              <Link href={getMechanicDetailHref(mechanic.id)}>Ver detalle</Link>
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
            {mechanics.map((mechanic) => (
              <Card className="bg-white/86" key={mechanic.id}>
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {mechanic.photo_url ? (
                        <img alt={mechanic.full_name} className="size-16 rounded-[20px] object-cover" src={mechanic.photo_url} />
                      ) : (
                        <div className="flex size-16 items-center justify-center rounded-[20px] bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                          <UserRound className="size-7" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="primary">{getMechanicRoleLabel(mechanic.role)}</Badge>
                          <Badge variant={mechanic.is_active ? "success" : "default"}>
                            {mechanic.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <div>
                          <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                            {mechanic.full_name}
                          </div>
                          <div className="mt-1 text-sm text-[var(--muted)]">{mechanic.phone || "Sin telefono"}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="icon" variant="outline">
                        <Link href={getMechanicEditHref(mechanic.id)}>
                          <SquarePen className="size-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="primary">
                        <Link href={getMechanicDetailHref(mechanic.id)}>Ver detalle</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard label="Activas" value={String(mechanic.assignedActiveOrders)} />
                    <StatCard label="Completadas" value={String(mechanic.assignedCompletedOrders)} />
                    <StatCard label="Carga" value={mechanic.assignedActiveOrders >= 5 ? "Alta" : "Manejable"} />
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-[var(--foreground)]">Ordenes actuales</div>
                    {mechanic.currentOrders.length ? (
                      <div className="grid gap-2">
                        {mechanic.currentOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-3">
                            <div>
                              <div className="text-sm font-medium">{order.title}</div>
                              <div className="text-xs text-[var(--muted)]">{order.vehicle_label || "Vehiculo pendiente"}</div>
                            </div>
                            <Badge>{getWorkOrderStatusLabel(order.status as never)}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm text-[var(--muted)]">
                        No tiene ordenes activas asignadas.
                      </div>
                    )}
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
              <Badge variant="primary">Equipo vacio</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Todavia no hay integrantes cargados
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Agrega al primer mecanico o apoyo operativo para empezar a asignar ordenes con visibilidad real.
              </p>
              <Button asChild variant="primary">
                <Link href={"/app/mechanics/new" as Route}>Agregar primer integrante</Link>
              </Button>
            </div>
            <div className="grid gap-3">
              {[
                "Cada integrante muestra carga activa y completada.",
                "La asignacion se conecta directo a ordenes de trabajo.",
                "El rol deja la base lista para permisos y comisiones futuras.",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                  <UsersRound className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function getWorkOrderStatusLabel(status: string) {
  switch (status) {
    case "presupuesto_pendiente":
      return "Presupuesto pendiente";
    case "diagnostico_pendiente":
      return "Diagnostico pendiente";
    case "en_reparacion":
      return "En reparacion";
    case "listo_para_entrega":
      return "Listo para entrega";
    case "completada":
      return "Completada";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
}
