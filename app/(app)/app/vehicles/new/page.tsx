import type { Route } from "next";
import Link from "next/link";
import { ContactRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VehicleProfileFormValues } from "@/lib/vehicles/schema";

import { PageHeader } from "@/components/shared/page-header";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { getVehicleOwnerOptions } from "@/lib/data/vehicles";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type NewVehiclePageProps = {
  searchParams: Promise<{
    clientId?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewVehiclePage({ searchParams }: NewVehiclePageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const clientOptions = await getVehicleOwnerOptions();

  const initialValues: VehicleProfileFormValues = {
    clientId: getQueryValue(params.clientId) ?? "",
    make: "",
    model: "",
    year: "",
    plate: "",
    color: "",
    mileage: "",
    vin: "",
    notes: "",
    photoUrls: [],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo vehiculo"
        description="Registra una ficha lista para tecnicos, presupuestos y seguimiento por vehiculo."
        status="Vehiculos"
      />
      {clientOptions.length ? (
        <VehicleForm clientOptions={clientOptions} initialValues={initialValues} mode="create" />
      ) : (
        <Card className="bg-white/86">
          <CardContent className="space-y-4 p-6">
            <Badge variant="primary">Cliente requerido</Badge>
            <div className="space-y-2">
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Primero crea un cliente
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Cada vehiculo en Fixy nace vinculado a un propietario. Esto mantiene limpio el
                flujo para presupuestos, ordenes e historial.
              </p>
            </div>
            <Button asChild variant="primary">
              <Link href={"/app/clients/new" as Route}>
                <ContactRound className="size-4" />
                Crear cliente
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
