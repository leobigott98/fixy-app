import type { Route } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCarOwnerVehicles } from "@/lib/data/car-owners";

export default async function OwnerVehiclesPage() {
  const vehicles = await getCarOwnerVehicles();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis carros"
        description="Cada carro tiene su propia ficha para fotos, citas y trazabilidad de servicios."
        status="Garage"
        action={{ label: "Agregar carro", href: "/app/my-cars/new" as Route }}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {vehicles.length ? (
          vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="bg-white/88">
              <CardContent className="space-y-4 px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                      {vehicle.label}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted)]">
                      {[vehicle.color, vehicle.plate, vehicle.vin].filter(Boolean).join(" · ") || "Ficha base cargada"}
                    </div>
                  </div>
                  {vehicle.photoUrls[0] ? (
                    <img alt={vehicle.label} className="size-20 rounded-[24px] object-cover" src={vehicle.photoUrls[0]} />
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {vehicle.vehicleYear ? <Badge>{vehicle.vehicleYear}</Badge> : null}
                  {vehicle.mileage ? <Badge variant="primary">{`${vehicle.mileage} km`}</Badge> : null}
                  <Badge variant="success">{`${vehicle.photoUrls.length} foto${vehicle.photoUrls.length === 1 ? "" : "s"}`}</Badge>
                </div>

                {vehicle.notes ? (
                  <div className="rounded-[22px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                    {vehicle.notes}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="outline">
                    <Link href={`/app/my-cars/${vehicle.id}/edit` as Route}>Editar ficha</Link>
                  </Button>
                  <Button asChild variant="primary">
                    <Link href={`/app/appointments/new?vehicle=${vehicle.id}` as Route}>Pedir cita</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-white/88 lg:col-span-2">
            <CardContent className="space-y-4 px-6 py-8 text-center">
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                Aun no has agregado carros
              </div>
              <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                Empieza por cargar el principal. Asi podras pedir citas, registrar servicios y dejar reseñas con mejor contexto.
              </div>
              <div className="flex justify-center">
                <Button asChild variant="primary">
                  <Link href={"/app/my-cars/new" as Route}>Agregar mi primer carro</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
