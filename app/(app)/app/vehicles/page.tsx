import type { Route } from "next";
import Link from "next/link";
import { CarFront, FilePlus2, History, LayoutGrid, SquarePen, TableProperties, UserRound, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getVehicleDetailHref, getVehicleEditHref, getVehiclesList } from "@/lib/data/vehicles";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type VehiclesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    view?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getViewValue(value?: string) {
  return value === "table" ? "table" : "cards";
}

function buildViewHref(view: "cards" | "table", query?: string) {
  const params = new URLSearchParams();

  if (query?.trim()) {
    params.set("q", query.trim());
  }

  params.set("view", view);

  return `/app/vehicles?${params.toString()}` as Route;
}

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = getViewValue(getQueryValue(params.view));
  const vehicles = await getVehiclesList(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehiculos"
        description="Ficha tecnica clara por vehiculo, conectada al cliente correcto y lista para quotes, ordenes e historial."
        status="Sprint 2"
        action={{
          label: "Nuevo vehiculo",
          icon: <FilePlus2 className="size-4" />,
          href: "/app/vehicles/new" as Route,
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <SearchBar
          action={`/app/vehicles?view=${view}`}
          placeholder="Busca por placa, marca, modelo o VIN"
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

      {vehicles.length ? (
        view === "table" ? (
          <Card className="bg-white/88">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Vehiculo</th>
                      <th className="px-5 py-4 font-semibold">Propietario</th>
                      <th className="px-5 py-4 font-semibold">Placa</th>
                      <th className="px-5 py-4 font-semibold">Km</th>
                      <th className="px-5 py-4 font-semibold">Presupuestos</th>
                      <th className="px-5 py-4 font-semibold">Ordenes</th>
                      <th className="px-5 py-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle) => (
                      <tr className="border-t border-[var(--line)] align-top" key={vehicle.id}>
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {vehicle.vehicle_label || [vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                          </div>
                          <div className="mt-1 text-xs text-[var(--muted)]">
                            {vehicle.color || "Sin color"} · {vehicle.vehicle_year || "Sin anio"}
                          </div>
                        </td>
                        <td className="px-5 py-4">{vehicle.owner?.full_name || "Sin propietario"}</td>
                        <td className="px-5 py-4">{vehicle.plate || "Sin placa"}</td>
                        <td className="px-5 py-4">
                          {vehicle.mileage ? `${vehicle.mileage.toLocaleString("es-VE")} km` : "Opcional"}
                        </td>
                        <td className="px-5 py-4">{vehicle.quoteCount}</td>
                        <td className="px-5 py-4">{vehicle.workOrderCount}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={getVehicleEditHref(vehicle.id)}>
                                <SquarePen className="size-4" />
                                Editar
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="primary">
                              <Link href={getVehicleDetailHref(vehicle.id)}>Ver detalle</Link>
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
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="bg-white/86">
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">{vehicle.plate || "Sin placa"}</Badge>
                        <Badge>{vehicle.vehicle_year || "Sin anio"}</Badge>
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                          {vehicle.vehicle_label || [vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {vehicle.owner?.full_name || "Sin propietario asignado"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="icon" variant="outline">
                        <Link href={getVehicleEditHref(vehicle.id)}>
                          <SquarePen className="size-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="primary">
                        <Link href={getVehicleDetailHref(vehicle.id)}>Ver detalle</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                      <div className="text-sm text-[var(--muted)]">Presupuestos</div>
                      <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                        {vehicle.quoteCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                      <div className="text-sm text-[var(--muted)]">Ordenes</div>
                      <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                        {vehicle.workOrderCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                      <div className="text-sm text-[var(--muted)]">Kilometraje</div>
                      <div className="mt-2 text-sm font-medium">
                        {vehicle.mileage ? `${vehicle.mileage.toLocaleString("es-VE")} km` : "Opcional"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
                    {vehicle.color ? <Badge>{vehicle.color}</Badge> : null}
                    {vehicle.make ? <Badge>{vehicle.make}</Badge> : null}
                    {vehicle.model ? <Badge>{vehicle.model}</Badge> : null}
                    {vehicle.vin ? <Badge>VIN cargado</Badge> : null}
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
              <Badge variant="primary">Base vacia</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Todavia no hay vehiculos
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Registra el primer vehiculo del taller para dejar lista la ficha tecnica y el
                contexto operativo que necesitaran presupuestos y ordenes.
              </p>
              <Button asChild variant="primary">
                <Link href={"/app/vehicles/new" as Route}>Crear primer vehiculo</Link>
              </Button>
            </div>
            <div className="grid gap-3">
              {[
                { icon: <UserRound className="size-4" />, text: "Cada vehiculo queda vinculado a un cliente desde el inicio." },
                { icon: <Wrench className="size-4" />, text: "La vista ya reserva espacio para ordenes por vehiculo." },
                { icon: <History className="size-4" />, text: "El historial de reparaciones tendra un hogar claro." },
                { icon: <CarFront className="size-4" />, text: "Marca, modelo, placa y kilometraje quedan listos para el equipo." },
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
