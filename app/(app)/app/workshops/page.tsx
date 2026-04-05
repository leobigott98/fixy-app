import type { Route } from "next";
import type { Metadata } from "next";

import { WorkshopDirectoryFilters } from "@/components/marketplace/workshop-directory-filters";
import { WorkshopListingCard } from "@/components/marketplace/workshop-listing-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getMarketplaceDirectory } from "@/lib/data/marketplace";

type OwnerWorkshopsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    city?: string | string[];
    service?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata: Metadata = {
  title: "Talleres | Fixy",
};

export default async function OwnerWorkshopsPage({ searchParams }: OwnerWorkshopsPageProps) {
  const params = await searchParams;
  const filters = {
    query: getFirstParam(params.q)?.trim() || "",
    location: getFirstParam(params.city)?.trim() || "",
    service: getFirstParam(params.service)?.trim() || "",
  };
  const directory = await getMarketplaceDirectory(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buscar talleres"
        description="Discovery simple, visual y mobil-first para encontrar taller, comparar contexto y pedir atencion rapido."
        status="Marketplace"
      />

      <WorkshopDirectoryFilters
        actionPath={"/app/workshops" as Route}
        clearHref={"/app/workshops" as Route}
        location={filters.location}
        locations={directory.locations}
        query={filters.query}
        service={filters.service}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {directory.workshops.length ? (
          directory.workshops.map((workshop) => (
            <WorkshopListingCard key={workshop.id} workshop={workshop} />
          ))
        ) : (
          <Card className="bg-white/88 lg:col-span-2">
            <CardContent className="space-y-3 px-6 py-8 text-center">
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                No encontramos talleres con esos filtros
              </div>
              <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                Prueba otra ciudad o cambia el servicio. El objetivo aqui es discovery rapido, no un marketplace pesado.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
