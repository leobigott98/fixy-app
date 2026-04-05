import type { Route } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCarOwnerAppointments } from "@/lib/data/car-owners";

export default async function OwnerAppointmentsPage() {
  const appointments = await getCarOwnerAppointments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis citas"
        description="Sigue solicitudes, confirmaciones y visitas programadas sin perder el contexto del carro."
        status="Agenda"
        action={{ label: "Nueva cita", href: "/app/appointments/new" as Route }}
      />

      <div className="grid gap-4">
        {appointments.length ? (
          appointments.map((appointment) => (
            <Card key={appointment.id} className="bg-white/88">
              <CardContent className="space-y-3 px-5 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                      {appointment.workshop.name}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {[appointment.workshop.city, appointment.vehicle?.label, appointment.serviceNeeded]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <Badge variant={appointment.status === "confirmada" ? "success" : "primary"}>
                    {appointment.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge>{appointment.requestedDate}</Badge>
                  <Badge variant="primary">{appointment.requestedTime}</Badge>
                  <Badge variant="success">{appointment.contactChannel}</Badge>
                </div>

                <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                  {appointment.issueSummary}
                </div>

                {appointment.workshopResponseNote ? (
                  <div className="rounded-[24px] border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] p-4 text-sm leading-6 text-[var(--foreground)]">
                    {appointment.workshopResponseNote}
                  </div>
                ) : null}

                {appointment.workshop.slug ? (
                  <div className="flex justify-end">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/talleres/${appointment.workshop.slug}` as Route}>Ver taller</Link>
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
                No tienes citas registradas
              </div>
              <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                Busca un taller y manda una solicitud con tu carro para empezar a llevar control de todo desde el app.
              </div>
              <div className="flex justify-center">
                <Button asChild variant="primary">
                  <Link href={"/app/appointments/new" as Route}>Solicitar una cita</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
