import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Globe, MapPin, ShieldCheck } from "lucide-react";

import { FixyLogo } from "@/components/brand/fixy-logo";
import { WorkshopDirectoryFilters } from "@/components/marketplace/workshop-directory-filters";
import { WorkshopListingCard } from "@/components/marketplace/workshop-listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMarketplaceDirectory } from "@/lib/data/marketplace";

type DirectoryPageProps = {
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
  description:
    "Directorio de talleres en Fixy para descubrir servicios, contacto y confianza desde el telefono.",
};

export default async function WorkshopDirectoryPage({ searchParams }: DirectoryPageProps) {
  const params = await searchParams;
  const filters = {
    query: getFirstParam(params.q)?.trim() || "",
    location: getFirstParam(params.city)?.trim() || "",
    service: getFirstParam(params.service)?.trim() || "",
  };
  const directory = await getMarketplaceDirectory(filters);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#fff_32%,#f8fafc_100%)]">
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-5 sm:px-6 lg:px-8 lg:pb-20 lg:pt-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FixyLogo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/">Inicio</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/signup">Crear taller</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-8 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pt-16">
          <div className="space-y-5">
            <Badge variant="primary">Discovery para conductores</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-[family-name:var(--font-heading)] text-5xl font-bold tracking-tight sm:text-6xl">
                Encuentra un taller confiable y pide atencion sin friccion.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                Fixy conecta perfiles de talleres reales con conductores que necesitan resolver
                mantenimiento, diagnosticos y reparaciones de forma directa.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <DiscoveryPill
              icon={<Globe className="size-4" />}
              title="Busqueda simple"
              text="Directorio movil-first con filtros por ubicacion y servicio."
            />
            <DiscoveryPill
              icon={<ShieldCheck className="size-4" />}
              title="Confianza primero"
              text="Perfil publico, horario, contacto y base de resenas visibles."
            />
            <DiscoveryPill
              icon={<MapPin className="size-4" />}
              title="Lead generation"
              text="Solicitud ligera y salida directa por WhatsApp."
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <WorkshopDirectoryFilters
            location={filters.location}
            locations={directory.locations}
            query={filters.query}
            service={filters.service}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                {directory.total} talleres visibles
              </div>
              <div className="text-sm leading-6 text-[var(--muted)]">
                {filters.query || filters.location || filters.service
                  ? "Resultados filtrados para que encuentres una opcion clara mas rapido."
                  : "Perfiles publicos listos para discovery, sin ranking pesado ni marketplace complejo."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.location ? <Badge>{filters.location}</Badge> : null}
              {filters.service ? <Badge variant="primary">{filters.service}</Badge> : null}
              {filters.query ? <Badge>{`"${filters.query}"`}</Badge> : null}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {directory.workshops.length ? (
            directory.workshops.map((workshop) => (
              <WorkshopListingCard key={workshop.id} workshop={workshop} />
            ))
          ) : (
            <Card className="border border-dashed border-[var(--line)] bg-white/84 lg:col-span-2">
              <CardContent className="space-y-3 px-6 py-8 text-center">
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  No encontramos talleres con esos filtros
                </div>
                <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                  Prueba otra ubicacion, cambia el servicio o limpia la busqueda. La capa de
                  discovery esta pensada para ser simple y clara.
                </div>
                <div className="flex justify-center">
                  <Button asChild variant="outline">
                    <Link href="/talleres">Limpiar filtros</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function DiscoveryPill({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-white/80 p-4 shadow-[0_18px_40px_rgba(21,28,35,0.06)]">
      <div className="flex items-center gap-2 text-[var(--primary-strong)]">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">{text}</div>
    </div>
  );
}
