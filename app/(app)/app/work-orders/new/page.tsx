import type { Route } from "next";
import Link from "next/link";
import { CarFront, ContactRound } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkOrderForm } from "@/components/work-orders/work-order-form";
import { buildWorkOrderFormDefaults, getWorkOrderFormOptions } from "@/lib/data/work-orders";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type NewWorkOrderPageProps = {
  searchParams: Promise<{
    clientId?: string | string[];
    vehicleId?: string | string[];
    quoteId?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewWorkOrderPage({ searchParams }: NewWorkOrderPageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const options = await getWorkOrderFormOptions();

  if (!options.clients.length || !options.vehicles.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nueva orden"
          description="Necesitas cliente y vehiculo antes de abrir trabajo para no romper la trazabilidad."
          status="Ordenes"
        />
        <Card className="bg-white/86">
          <CardContent className="space-y-4 p-6">
            <Badge variant="primary">Base requerida</Badge>
            <div className="space-y-2">
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Primero completa cliente y vehiculo
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                La orden tiene que nacer con contexto claro. Asi Fixy puede mover el taller sin
                depender de memoria, notas sueltas o conversaciones por WhatsApp.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="primary">
                <Link href={"/app/clients/new" as Route}>
                  <ContactRound className="size-4" />
                  Crear cliente
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={"/app/vehicles/new" as Route}>
                  <CarFront className="size-4" />
                  Crear vehiculo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initialValues = buildWorkOrderFormDefaults(options, {
    selectedClientId: getQueryValue(params.clientId),
    selectedVehicleId: getQueryValue(params.vehicleId),
    selectedQuoteId: getQueryValue(params.quoteId),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva orden"
        description="Abre trabajo rapido, con etapa visible, items separados y base lista para seguimiento."
        status="Ordenes"
      />
      <WorkOrderForm
        initialValues={initialValues}
        mode="create"
        options={options}
        preferredCurrency={workshop.preferred_currency}
      />
    </div>
  );
}
