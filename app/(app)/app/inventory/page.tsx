import type { Route } from "next";
import Link from "next/link";
import { Boxes, LayoutGrid, PackagePlus, TableProperties } from "lucide-react";

import { EmptyDataTable } from "@/components/shared/empty-data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { moduleContent } from "@/lib/modules";

type InventoryPageProps = {
  searchParams: Promise<{
    view?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getViewValue(value?: string) {
  return value === "table" ? "table" : "cards";
}

function buildViewHref(view: "cards" | "table") {
  return `/app/inventory?view=${view}` as Route;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const view = getViewValue(getQueryValue(params.view));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description={moduleContent.inventory.description}
        status="Base"
        action={{
          label: "Nuevo repuesto",
          icon: <PackagePlus className="size-4" />,
          href: "/app/inventory" as Route,
        }}
      />

      <ViewToggle
        options={[
          {
            href: buildViewHref("cards"),
            label: "Cards",
            icon: <LayoutGrid className="size-4" />,
            active: view === "cards",
          },
          {
            href: buildViewHref("table"),
            label: "Tabla",
            icon: <TableProperties className="size-4" />,
            active: view === "table",
          },
        ]}
      />

      {view === "table" ? (
        <EmptyDataTable
          actionHref={"/app/inventory" as Route}
          actionLabel="Preparar inventario"
          columns={["Repuesto", "Stock", "Minimo", "Costo", "Estado", "Acciones"]}
          description="La vista tabla ya esta lista para cuando actives el modulo de inventario real."
          icon={<Boxes className="size-5" />}
          title="Todavia no hay repuestos cargados"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {moduleContent.inventory.metrics.map((metric) => (
            <Card className="bg-white/86" key={metric.label}>
              <CardContent className="space-y-3 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-[var(--muted)]">{metric.label}</div>
                  <Badge
                    variant={
                      "tone" in metric && metric.tone === "primary"
                        ? "primary"
                        : "tone" in metric && metric.tone === "success"
                          ? "success"
                          : "default"
                    }
                  >
                    {metric.value}
                  </Badge>
                </div>
                <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-white/86 xl:col-span-2">
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Badge variant="primary">Vista card</Badge>
                <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                  Inventario listo para crecer
                </div>
                <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                  Esta vista ya sigue el mismo patrón del resto de Fixy: cards rápidas o tabla operativa, sin diseño de ERP pesado.
                </p>
                <Button asChild variant="outline">
                  <Link href={"/app/inventory?view=table" as Route}>Ver tabla</Link>
                </Button>
              </div>
              <div className="grid gap-3">
                {moduleContent.inventory.quickActions.map((item) => (
                  <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6" key={item}>
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
