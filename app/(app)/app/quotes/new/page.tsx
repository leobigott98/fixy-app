import type { Route } from "next";
import Link from "next/link";
import { CarFront, ContactRound } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteForm } from "@/components/quotes/quote-form";
import { buildQuoteFormDefaults, getQuoteFormOptions } from "@/lib/data/quotes";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type NewQuotePageProps = {
  searchParams: Promise<{
    clientId?: string | string[];
    vehicleId?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const workshop = await requireCurrentWorkshop();
  const params = await searchParams;
  const options = await getQuoteFormOptions();

  if (!options.clients.length || !options.vehicles.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nuevo presupuesto"
          description="Necesitas cliente y vehiculo antes de cotizar para mantener el flujo claro."
          status="Presupuestos"
        />
        <Card className="bg-white/86">
          <CardContent className="space-y-4 p-6">
            <Badge variant="primary">Base requerida</Badge>
            <div className="space-y-2">
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Primero completa cliente y vehiculo
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Fixy cotiza mas rapido cuando el contexto ya esta bien armado. Asi el presupuesto no
                nace desconectado del cliente ni del vehiculo.
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

  const initialValues = buildQuoteFormDefaults(options, {
    selectedClientId: getQueryValue(params.clientId),
    selectedVehicleId: getQueryValue(params.vehicleId),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo presupuesto"
        description="Crea un presupuesto rapido, legible y listo para enviar al cliente."
        status="Presupuestos"
      />
      <QuoteForm
        initialValues={initialValues}
        mode="create"
        options={options}
        preferredCurrency={workshop.preferred_currency}
      />
    </div>
  );
}
