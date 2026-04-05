import type { Route } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { OwnerReviewForm } from "@/components/car-owners/owner-review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCarOwnerServiceRecords, getCarOwnerVehicles } from "@/lib/data/car-owners";
import { formatCurrencyDisplay } from "@/lib/utils";

export default async function OwnerHistoryPage() {
  const [records, vehicles] = await Promise.all([getCarOwnerServiceRecords(), getCarOwnerVehicles()]);
  const reviewWorkshops = Array.from(
    new Map(
      records
        .filter((record) => record.workshopId)
        .map((record) => [
          record.workshopId as string,
          { id: record.workshopId as string, name: record.workshopName },
        ]),
    ).values(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de servicios"
        description="Reparaciones, partes, costos, fechas, fotos y notas en una linea de tiempo util de verdad."
        status="Historial"
        action={{ label: "Agregar registro", href: "/app/history/new" as Route }}
      />

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          {records.length ? (
            records.map((record) => (
              <Card key={record.id} className="bg-white/88">
                <CardContent className="space-y-4 px-5 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                        {record.serviceType}
                      </div>
                      <div className="text-sm text-[var(--muted)]">
                        {[record.workshopName, record.vehicle?.label, record.serviceDate]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrencyDisplay(record.totalCost, record.currency)}
                      </div>
                      <div className="text-sm text-[var(--muted)]">
                        {record.durationHours ? `${record.durationHours} h` : "Sin horas"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                    {record.description}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {record.partsUsed.map((part) => (
                      <Badge key={part}>{part}</Badge>
                    ))}
                    {record.mechanicName ? <Badge variant="primary">{record.mechanicName}</Badge> : null}
                  </div>

                  {record.photoUrls.length ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {record.photoUrls.slice(0, 3).map((value) => (
                        <img key={value} alt={record.serviceType} className="h-28 w-full rounded-[20px] object-cover" src={value} />
                      ))}
                    </div>
                  ) : null}

                  {record.notes ? (
                    <div className="text-sm leading-6 text-[var(--muted)]">{record.notes}</div>
                  ) : null}

                  {record.workshopSlug ? (
                    <div className="flex justify-end">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/talleres/${record.workshopSlug}` as Route}>Ver taller</Link>
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-white/88">
              <CardContent className="space-y-4 px-6 py-8 text-center">
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  Tu historial esta vacio
                </div>
                <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                  Cuando guardes reparaciones o mantenimientos, aqui quedara la memoria completa del carro.
                </div>
                <div className="flex justify-center">
                  <Button asChild variant="primary">
                    <Link href={"/app/history/new" as Route}>Crear primer registro</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {reviewWorkshops.length > 0 && vehicles.length > 0 ? (
            <OwnerReviewForm
              vehicleOptions={vehicles.map((item) => ({ id: item.id, label: item.label }))}
              workshopOptions={reviewWorkshops}
            />
          ) : null}

          <Card className="bg-white/86">
            <CardContent className="space-y-3 px-5 py-5">
              {[
                "Guarda tambien servicios pequeños: aceite, bateria, alineacion.",
                "Si agregas costo y piezas, luego puedes comparar que taller te sale mejor.",
                "Las fotos ayudan si luego necesitas vender el carro o reclamar una garantia.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
