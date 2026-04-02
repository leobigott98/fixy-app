import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import {
  getAppointmentStatusLabel,
  getAppointmentTypeLabel,
  type AppointmentStatus,
  type AppointmentType,
} from "@/lib/appointments/constants";
import {
  normalizeAppointmentInput,
  type AppointmentFormValues,
  type AppointmentInput,
} from "@/lib/appointments/schema";
import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type ClientLite = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
};

type VehicleLite = {
  id: string;
  client_id: string | null;
  vehicle_label: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  vehicle_year: number | null;
};

export type AppointmentRecord = {
  id: string;
  workshop_id: string;
  client_id: string | null;
  vehicle_id: string | null;
  appointment_date: string;
  appointment_time: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type AppointmentRowWithRelations = AppointmentRecord & {
  clients: ClientLite | ClientLite[] | null;
  vehicles: VehicleLite | VehicleLite[] | null;
};

export type AppointmentListItem = AppointmentRecord & {
  client: ClientLite | null;
  vehicle: VehicleLite | null;
  displayTime: string;
};

export type AppointmentDayBucket = {
  date: string;
  label: string;
  shortLabel: string;
  appointments: AppointmentListItem[];
};

export type CalendarSummary = {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

export type CalendarViewData = {
  scope: "day" | "week" | "month";
  selectedDate: string;
  summary: CalendarSummary;
  dayBuckets: AppointmentDayBucket[];
};

export type AppointmentFormOptions = {
  clients: Array<{
    id: string;
    fullName: string;
    whatsappPhone: string | null;
  }>;
  vehicles: Array<{
    id: string;
    clientId: string | null;
    label: string;
  }>;
};

function toSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDayLabel(dateValue: string, short = false) {
  return new Intl.DateTimeFormat("es-VE", {
    weekday: short ? "short" : "long",
    day: "2-digit",
    month: short ? undefined : "long",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function formatTimeLabel(timeValue: string) {
  return timeValue.slice(0, 5);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekStart(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function getMonthGridDates(dateValue: string) {
  const target = new Date(`${dateValue}T12:00:00`);
  const monthStart = new Date(target.getFullYear(), target.getMonth(), 1);
  const monthEnd = new Date(target.getFullYear(), target.getMonth() + 1, 0);

  const start = getWeekStart(monthStart.toISOString().slice(0, 10));
  const monthEndIso = monthEnd.toISOString().slice(0, 10);
  const monthEndDate = new Date(`${monthEndIso}T12:00:00`);
  const end = addDays(monthEndIso, monthEndDate.getDay() === 0 ? 0 : 7 - monthEndDate.getDay());
  const dates: string[] = [];

  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return {
    start,
    end,
    dates,
  };
}

function getScopeDates(dateValue: string, scope: "day" | "week" | "month") {
  if (scope === "day") {
    return {
      start: dateValue,
      end: dateValue,
      dates: [dateValue],
    };
  }

  if (scope === "month") {
    return getMonthGridDates(dateValue);
  }

  const start = getWeekStart(dateValue);
  const dates = Array.from({ length: 7 }).map((_, index) => addDays(start, index));

  return {
    start,
    end: dates[dates.length - 1] ?? start,
    dates,
  };
}

function buildSummary(appointments: AppointmentListItem[]): CalendarSummary {
  return {
    total: appointments.length,
    pending: appointments.filter((appointment) => appointment.status === "pendiente").length,
    confirmed: appointments.filter((appointment) => appointment.status === "confirmada").length,
    completed: appointments.filter((appointment) => appointment.status === "completada").length,
    cancelled: appointments.filter((appointment) => appointment.status === "cancelada").length,
  };
}

function normalizeAppointmentRow(row: AppointmentRowWithRelations): AppointmentListItem {
  return {
    ...row,
    client: toSingleRelation(row.clients),
    vehicle: toSingleRelation(row.vehicles),
    displayTime: formatTimeLabel(row.appointment_time),
  };
}

async function validateAppointmentRelations(input: AppointmentInput) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data: vehicleData, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id,client_id,vehicle_label,plate,make,model,vehicle_year")
    .eq("workshop_id", workshop.id)
    .eq("id", input.vehicleId)
    .maybeSingle();

  if (vehicleError) {
    throw vehicleError;
  }

  const vehicle = (vehicleData as VehicleLite | null) ?? null;

  if (!vehicle) {
    throw new Error("Selecciona un vehiculo valido.");
  }

  if (vehicle.client_id !== input.clientId) {
    throw new Error("El vehiculo seleccionado no pertenece al cliente.");
  }

  return {
    workshop,
  };
}

export async function getAppointmentFormOptions(): Promise<AppointmentFormOptions> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const [clientsResult, vehiclesResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,full_name,whatsapp_phone")
      .eq("workshop_id", workshop.id)
      .order("full_name"),
    supabase
      .from("vehicles")
      .select("id,client_id,vehicle_label,plate,make,model,vehicle_year")
      .eq("workshop_id", workshop.id)
      .order("updated_at", { ascending: false }),
  ]);

  const nonMissingError = [clientsResult.error, vehiclesResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  return {
    clients: (((clientsResult.data as Array<{
      id: string;
      full_name: string;
      whatsapp_phone: string | null;
    }> | null) ?? []).map((client) => ({
      id: client.id,
      fullName: client.full_name,
      whatsappPhone: client.whatsapp_phone,
    }))),
    vehicles: (((vehiclesResult.data as VehicleLite[] | null) ?? []).map((vehicle) => ({
      id: vehicle.id,
      clientId: vehicle.client_id,
      label:
        vehicle.vehicle_label ??
        [vehicle.make, vehicle.model, vehicle.vehicle_year, vehicle.plate].filter(Boolean).join(" "),
    }))),
  };
}

export async function getCalendarViewData(params: {
  selectedDate: string;
  scope: "day" | "week" | "month";
}): Promise<CalendarViewData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const scopeDates = getScopeDates(params.selectedDate, params.scope);

  const { data, error } = await supabase
    .from("appointments")
    .select("*, clients(id,full_name,phone,whatsapp_phone), vehicles(id,client_id,vehicle_label,plate,make,model,vehicle_year)")
    .eq("workshop_id", workshop.id)
    .gte("appointment_date", scopeDates.start)
    .lte("appointment_date", scopeDates.end)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        scope: params.scope,
        selectedDate: params.selectedDate,
        summary: buildSummary([]),
        dayBuckets: scopeDates.dates.map((date) => ({
          date,
          label: formatDayLabel(date),
          shortLabel: formatDayLabel(date, true),
          appointments: [],
        })),
      };
    }

    throw error;
  }

  const appointments = ((data as AppointmentRowWithRelations[] | null) ?? []).map(normalizeAppointmentRow);
  const byDate = appointments.reduce<Record<string, AppointmentListItem[]>>((acc, appointment) => {
    acc[appointment.appointment_date] = [...(acc[appointment.appointment_date] ?? []), appointment];
    return acc;
  }, {});

  return {
    scope: params.scope,
    selectedDate: params.selectedDate,
    summary: buildSummary(appointments),
    dayBuckets: scopeDates.dates.map((date) => ({
      date,
      label: formatDayLabel(date),
      shortLabel: formatDayLabel(date, true),
      appointments: byDate[date] ?? [],
    })),
  };
}

export async function getAppointmentForEdit(appointmentId: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      notFound();
    }

    throw error;
  }

  if (!data) {
    notFound();
  }

  return data as AppointmentRecord;
}

export async function upsertAppointment(values: AppointmentFormValues, appointmentId?: string) {
  const input = normalizeAppointmentInput(values);
  const { workshop } = await validateAppointmentRelations(input);
  const supabase = await createSupabaseDataClient();

  const payload = {
    workshop_id: workshop.id,
    client_id: input.clientId,
    vehicle_id: input.vehicleId,
    appointment_date: input.date,
    appointment_time: input.time,
    appointment_type: input.type,
    status: input.status,
    notes: input.notes || null,
  };

  const query = appointmentId
    ? supabase.from("appointments").update(payload).eq("workshop_id", workshop.id).eq("id", appointmentId)
    : supabase.from("appointments").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  return data as AppointmentRecord;
}

export function getAppointmentEditHref(appointmentId: string) {
  return `/app/calendar/${appointmentId}/edit` as Route;
}

export function getCalendarNewHref(selectedDate?: string) {
  return selectedDate
    ? (`/app/calendar/new?date=${selectedDate}` as Route)
    : ("/app/calendar/new" as Route);
}

export async function requireAppointmentOrRedirect(appointmentId: string) {
  try {
    return await getAppointmentForEdit(appointmentId);
  } catch {
    redirect("/app/calendar" as Route);
  }
}

export function buildCalendarRangeHref(scope: "day" | "week" | "month", date: string) {
  return `/app/calendar?scope=${scope}&date=${date}` as Route;
}

export function buildCalendarShiftHref(scope: "day" | "week" | "month", date: string, direction: "prev" | "next") {
  if (scope === "month") {
    const target = new Date(`${date}T12:00:00`);
    target.setMonth(target.getMonth() + (direction === "prev" ? -1 : 1));
    return buildCalendarRangeHref(scope, target.toISOString().slice(0, 10));
  }

  const step = scope === "day" ? 1 : 7;
  const adjustedDate = addDays(date, direction === "prev" ? -step : step);
  return buildCalendarRangeHref(scope, adjustedDate);
}

export function getCalendarScopeLabel(scope: "day" | "week" | "month") {
  return scope === "day" ? "Dia" : scope === "week" ? "Semana" : "Mes";
}

export function getAppointmentCardMeta(appointment: AppointmentListItem) {
  return [
    appointment.displayTime,
    getAppointmentTypeLabel(appointment.appointment_type),
    getAppointmentStatusLabel(appointment.status),
  ].join(" · ");
}
