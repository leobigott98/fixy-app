import type { Route } from "next";
import Link from "next/link";
import { CarFront, ClipboardList, CreditCard, FilePlus2, LayoutGrid, SquarePen, TableProperties, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SearchBar } from "@/components/shared/search-bar";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getClientDetailHref, getClientEditHref, getClientsList } from "@/lib/data/clients";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { getPreferredListView } from "@/lib/view-preferences";

type ClientsPageProps = {
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

  return `/app/clients?${params.toString()}` as Route;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const view = await getPreferredListView(getQueryValue(params.view));
  const clients = await getClientsList(query);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Base viva del taller para responder rapido, mantener contexto y relacionar vehiculos sin friccion."
        status="Sprint 2"
        action={{
          label: "Nuevo cliente",
          icon: <FilePlus2 className="size-4" />,
          href: "/app/clients/new" as Route,
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
        <SearchBar
          action={`/app/clients?view=${view}`}
          placeholder="Busca por nombre, telefono, WhatsApp o correo"
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

      {clients.length ? (
        view === "table" ? (
          <Card className="bg-white/88">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[rgba(21,28,35,0.04)] text-left text-[var(--muted)]">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Cliente</th>
                      <th className="px-5 py-4 font-semibold">Contacto</th>
                      <th className="px-5 py-4 font-semibold">Vehiculos</th>
                      <th className="px-5 py-4 font-semibold">Presupuestos</th>
                      <th className="px-5 py-4 font-semibold">Ordenes</th>
                      <th className="px-5 py-4 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr className="border-t border-[var(--line)] align-top" key={client.id}>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{client.full_name}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{client.email || "Sin correo"}</div>
                        </td>
                        <td className="px-5 py-4">{client.whatsapp_phone || client.phone || "Sin telefono"}</td>
                        <td className="px-5 py-4">{client.vehicleCount}</td>
                        <td className="px-5 py-4">{client.quoteCount}</td>
                        <td className="px-5 py-4">{client.workOrderCount}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={getClientEditHref(client.id)}>
                                <SquarePen className="size-4" />
                                Editar
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="primary">
                              <Link href={getClientDetailHref(client.id)}>Ver detalle</Link>
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
            {clients.map((client) => (
              <Card key={client.id} className="bg-white/86">
                <CardContent className="space-y-5 px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="primary">Cliente</Badge>
                        <Badge>{client.vehicleCount} vehiculos</Badge>
                      </div>
                      <div>
                        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                          {client.full_name}
                        </div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {client.whatsapp_phone || client.phone || "Sin telefono"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="icon" variant="outline">
                        <Link href={getClientEditHref(client.id)}>
                          <SquarePen className="size-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="primary">
                        <Link href={getClientDetailHref(client.id)}>Ver detalle</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                      <div className="text-sm text-[var(--muted)]">Presupuestos</div>
                      <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                        {client.quoteCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                      <div className="text-sm text-[var(--muted)]">Ordenes</div>
                      <div className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                        {client.workOrderCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                      <div className="text-sm text-[var(--muted)]">Correo</div>
                      <div className="mt-2 text-sm font-medium">{client.email || "Opcional"}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-[var(--foreground)]">Vehiculos vinculados</div>
                    {client.vehicles.length ? (
                      <div className="flex flex-wrap gap-2">
                        {client.vehicles.map((vehicle) => (
                          <Badge key={vehicle.id}>{vehicle.label}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-4 text-sm text-[var(--muted)]">
                        Todavia no tiene vehiculos vinculados.
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
              <Badge variant="primary">Base vacia</Badge>
              <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
                Todavia no hay clientes
              </div>
              <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                Crea tu primer cliente para comenzar a vincular vehiculos y preparar el flujo de
                presupuestos y ordenes del taller.
              </p>
              <Button asChild variant="primary">
                <Link href={"/app/clients/new" as Route}>Crear primer cliente</Link>
              </Button>
            </div>
            <div className="grid gap-3">
              {[
                { icon: <CarFront className="size-4" />, text: "Cada cliente puede tener varios vehiculos." },
                { icon: <ClipboardList className="size-4" />, text: "Los presupuestos apareceran aqui al activarse el siguiente modulo." },
                { icon: <Wrench className="size-4" />, text: "Las ordenes de trabajo se relacionaran directo al cliente y su vehiculo." },
                { icon: <CreditCard className="size-4" />, text: "El resumen de cobros quedara listo para crecer sin rehacer la ficha." },
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
