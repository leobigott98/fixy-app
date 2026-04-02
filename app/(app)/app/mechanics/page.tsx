import type { Route } from "next";
import Link from "next/link";
import { LayoutGrid, TableProperties, UserPlus, UsersRound } from "lucide-react";

import { EmptyDataTable } from "@/components/shared/empty-data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { moduleContent } from "@/lib/modules";

type MechanicsPageProps = {
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
  return `/app/mechanics?view=${view}` as Route;
}

export default async function MechanicsPage({ searchParams }: MechanicsPageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const view = getViewValue(getQueryValue(params.view));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipo"
        description={moduleContent.mechanics.description}
        status="Base"
        action={{
          label: "Agregar integrante",
          icon: <UserPlus className="size-4" />,
          href: "/app/mechanics" as Route,
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
          actionHref={"/app/mechanics" as Route}
          actionLabel="Preparar equipo"
          columns={["Integrante", "Especialidad", "Carga", "Estado", "Ordenes", "Acciones"]}
          description="La vista tabla ya esta lista para cuando actives la asignacion del equipo."
          icon={<UsersRound className="size-5" />}
          title="Todavia no hay integrantes cargados"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {moduleContent.mechanics.metrics.map((metric) => (
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
                  Equipo listo para asignacion operativa
                </div>
                <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                  Igual que clientes y órdenes, este módulo ya puede leerse en cards o tabla apenas actives la data real.
                </p>
                <Button asChild variant="outline">
                  <Link href={"/app/mechanics?view=table" as Route}>Ver tabla</Link>
                </Button>
              </div>
              <div className="grid gap-3">
                {moduleContent.mechanics.quickActions.map((item) => (
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
