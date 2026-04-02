import type { Route } from "next";
import Link from "next/link";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock3, FilePlus2, Wrench } from "lucide-react";

import { AppointmentStatusBadge } from "@/components/calendar/appointment-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { ViewToggle } from "@/components/shared/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppointmentTypeLabel } from "@/lib/appointments/constants";
import {
  buildCalendarRangeHref,
  buildCalendarShiftHref,
  getAppointmentCardMeta,
  getAppointmentEditHref,
  getCalendarNewHref,
  getCalendarViewData,
} from "@/lib/data/appointments";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type CalendarPageProps = {
  searchParams: Promise<{
    date?: string | string[];
    scope?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveScope(value?: string) {
  if (value === "week" || value === "month") {
    return value;
  }

  return "day";
}

function resolveDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const scope = resolveScope(getQueryValue(params.scope));
  const selectedDate = resolveDate(getQueryValue(params.date));
  const data = await getCalendarViewData({
    scope,
    selectedDate,
  });

  const activeBuckets = data.dayBuckets.filter((bucket) => bucket.appointments.length);
  const totalBuckets = data.dayBuckets.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        description="Agenda ligera para ordenar ingresos y visitas del taller con claridad diaria, sin volverla el centro del sistema."
        status="Sprint 9"
        action={{
          label: "Nueva cita",
          icon: <FilePlus2 className="size-4" />,
          href: getCalendarNewHref(selectedDate),
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto]">
        <ViewToggle
          options={[
            {
              href: buildCalendarRangeHref("day", selectedDate),
              label: "Dia",
              icon: <CalendarDays className="size-4" />,
              active: scope === "day",
            },
            {
              href: buildCalendarRangeHref("week", selectedDate),
              label: "Semana",
              icon: <CalendarRange className="size-4" />,
              active: scope === "week",
            },
            {
              href: buildCalendarRangeHref("month", selectedDate),
              label: "Mes",
              icon: <CalendarDays className="size-4" />,
              active: scope === "month",
            },
          ]}
        />

        <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-[var(--line)] bg-white/80 p-3 shadow-[0_18px_40px_rgba(21,28,35,0.06)]">
          <Button asChild size="sm" variant="outline">
            <Link href={buildCalendarShiftHref(scope, selectedDate, "prev")}>
              <ChevronLeft className="size-4" />
              {scope === "day" ? "Dia anterior" : scope === "week" ? "Semana anterior" : "Mes anterior"}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={buildCalendarRangeHref(scope, new Date().toISOString().slice(0, 10))}>
              Hoy
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={buildCalendarShiftHref(scope, selectedDate, "next")}>
              {scope === "day" ? "Dia siguiente" : scope === "week" ? "Semana siguiente" : "Mes siguiente"}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>

        <Button asChild variant="primary">
          <Link href={getCalendarNewHref(selectedDate)}>
            <FilePlus2 className="size-4" />
            Nueva cita
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Citas" value={String(data.summary.total)} />
        <MetricCard label="Pendientes" value={String(data.summary.pending)} />
        <MetricCard label="Confirmadas" value={String(data.summary.confirmed)} />
        <MetricCard label="Completadas" value={String(data.summary.completed)} />
        <MetricCard label="Dias con actividad" value={String(activeBuckets.length)} helper={`${totalBuckets} visibles`} />
      </div>

      {scope === "day" ? (
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>{data.dayBuckets[0]?.label || "Agenda del dia"}</CardTitle>
            <CardDescription>
              Vista diaria para recepcion, ingresos y visitas al taller.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.dayBuckets[0]?.appointments.length ? (
              data.dayBuckets[0].appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <EmptyCalendarState selectedDate={selectedDate} />
            )}
          </CardContent>
        </Card>
      ) : scope === "week" ? (
        <div className="grid gap-4 xl:grid-cols-7">
          {data.dayBuckets.map((bucket) => (
            <Card className="bg-white/86" key={bucket.date}>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{bucket.shortLabel}</CardTitle>
                    <CardDescription>{bucket.date}</CardDescription>
                  </div>
                  <Badge>{bucket.appointments.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bucket.appointments.length ? (
                  bucket.appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-[20px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">{appointment.displayTime}</div>
                        <AppointmentStatusBadge status={appointment.status} />
                      </div>
                      <div className="mt-2 text-sm font-medium">{appointment.client?.full_name || "Cliente pendiente"}</div>
                      <div className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {appointment.vehicle?.vehicle_label || appointment.vehicle?.plate || "Vehiculo pendiente"}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        {getAppointmentTypeLabel(appointment.appointment_type)}
                      </div>
                      <Link
                        className="mt-3 inline-flex text-xs font-medium text-[var(--primary-strong)] underline-offset-4 hover:underline"
                        href={getAppointmentEditHref(appointment.id)}
                      >
                        Editar
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(249,115,22,0.04)] p-3 text-sm leading-6 text-[var(--muted)]">
                    Sin citas
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white/86">
          <CardHeader>
            <CardTitle>
              {new Intl.DateTimeFormat("es-VE", {
                month: "long",
                year: "numeric",
              }).format(new Date(`${selectedDate}T12:00:00`))}
            </CardTitle>
            <CardDescription>
              Vista mensual para entender la distribucion de citas y detectar dias cargados de un vistazo.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 gap-3">
                {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.03)] px-3 py-2 text-sm font-medium text-[var(--muted)]"
                  >
                    {label}
                  </div>
                ))}
                {data.dayBuckets.map((bucket) => (
                  <MonthDayCell key={bucket.date} selectedDate={selectedDate} bucket={bucket} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/86">
        <CardHeader>
          <CardTitle>Lectura operativa</CardTitle>
          <CardDescription>
            El calendario acompana la operacion diaria y deja el contexto listo para recibir vehiculos mejor.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-3">
          {[
            "La agenda no reemplaza ordenes ni presupuestos: solo organiza ingresos y visitas.",
            "Dia y semana te dejan ver rapido carga, huecos y confirmaciones.",
            "Cada cita ya nace conectada a cliente y vehiculo para evitar trabajo duplicado.",
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
              <Wrench className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentCard({
  appointment,
}: {
  appointment: Awaited<ReturnType<typeof getCalendarViewData>>["dayBuckets"][number]["appointments"][number];
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">
              <Clock3 className="size-3.5" />
              {appointment.displayTime}
            </Badge>
            <AppointmentStatusBadge status={appointment.status} />
            <Badge>{getAppointmentTypeLabel(appointment.appointment_type)}</Badge>
          </div>
          <div>
            <div className="font-semibold">{appointment.client?.full_name || "Cliente pendiente"}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {appointment.vehicle?.vehicle_label || appointment.vehicle?.plate || "Vehiculo pendiente"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={getAppointmentEditHref(appointment.id)}>Editar</Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 text-sm leading-6 text-[var(--muted)]">
        {appointment.notes || "Sin notas adicionales para esta cita."}
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-[var(--muted)]">
        {getAppointmentCardMeta(appointment)}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card className="bg-white/84">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">{value}</div>
        {helper ? <div className="text-xs text-[var(--muted)]">{helper}</div> : null}
      </CardContent>
    </Card>
  );
}

function EmptyCalendarState({ selectedDate }: { selectedDate: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-3">
        <Badge variant="primary">Agenda vacia</Badge>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          No hay citas para este rango
        </div>
        <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
          Crea una cita para registrar ingresos de servicio o visitas al taller sin depender solo de WhatsApp.
        </p>
        <Button asChild variant="primary">
          <Link href={getCalendarNewHref(selectedDate)}>Crear primera cita</Link>
        </Button>
      </div>
      <div className="grid gap-3">
        {[
          "Las citas sirven para ordenar recepcion y seguimiento diario.",
          "Cliente y vehiculo quedan listos antes de abrir trabajo.",
          "Dia y semana se leen rapido desde el telefono o escritorio.",
        ].map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthDayCell({
  bucket,
  selectedDate,
}: {
  bucket: Awaited<ReturnType<typeof getCalendarViewData>>["dayBuckets"][number];
  selectedDate: string;
}) {
  const isCurrentMonth = bucket.date.slice(0, 7) === selectedDate.slice(0, 7);
  const isSelectedDay = bucket.date === selectedDate;

  return (
    <div
      className={
        isSelectedDay
          ? "min-h-[168px] rounded-[24px] border border-[rgba(249,115,22,0.34)] bg-[rgba(249,115,22,0.08)] p-3"
          : isCurrentMonth
            ? "min-h-[168px] rounded-[24px] border border-[var(--line)] bg-white/80 p-3"
            : "min-h-[168px] rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.03)] p-3 opacity-70"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[var(--foreground)]">{bucket.date.slice(-2)}</div>
        <div className="text-xs text-[var(--muted)]">{bucket.appointments.length}</div>
      </div>

      <div className="mt-3 space-y-2">
        {bucket.appointments.slice(0, 3).map((appointment) => (
          <Link
            key={appointment.id}
            className="block rounded-2xl bg-[rgba(21,28,35,0.05)] p-2 hover:bg-[rgba(249,115,22,0.08)]"
            href={getAppointmentEditHref(appointment.id)}
          >
            <div className="text-xs font-semibold">{appointment.displayTime}</div>
            <div className="mt-1 text-xs leading-5 text-[var(--foreground)]">
              {appointment.client?.full_name || "Cliente"}
            </div>
            <div className="mt-1 text-[11px] leading-4 text-[var(--muted)]">
              {appointment.notes || getAppointmentTypeLabel(appointment.appointment_type)}
            </div>
          </Link>
        ))}

        {bucket.appointments.length > 3 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] px-2 py-1.5 text-[11px] text-[var(--muted)]">
            +{bucket.appointments.length - 3} mas
          </div>
        ) : null}
      </div>
    </div>
  );
}
