import { z } from "zod";

import {
  appointmentStatusOptions,
  appointmentTypeOptions,
} from "@/lib/appointments/constants";

export const appointmentFormSchema = z.object({
  clientId: z.string().uuid("Selecciona un cliente."),
  vehicleId: z.string().uuid("Selecciona un vehiculo."),
  date: z.string().trim().min(1, "Selecciona la fecha."),
  time: z
    .string()
    .trim()
    .refine((value) => /^\d{2}:\d{2}$/.test(value), "Selecciona una hora valida."),
  type: z.enum(
    appointmentTypeOptions.map((option) => option.value) as ["ingreso_servicio", "visita_taller"],
    "Selecciona el tipo de cita.",
  ),
  status: z.enum(
    appointmentStatusOptions.map((option) => option.value) as [
      "pendiente",
      "confirmada",
      "completada",
      "cancelada",
    ],
    "Selecciona el estado.",
  ),
  notes: z.string().trim(),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export type AppointmentInput = {
  clientId: string;
  vehicleId: string;
  date: string;
  time: string;
  type: "ingreso_servicio" | "visita_taller";
  status: "pendiente" | "confirmada" | "completada" | "cancelada";
  notes: string;
};

export function normalizeAppointmentInput(values: AppointmentFormValues): AppointmentInput {
  return {
    clientId: values.clientId,
    vehicleId: values.vehicleId,
    date: values.date,
    time: values.time,
    type: values.type,
    status: values.status,
    notes: values.notes,
  };
}

export function buildAppointmentFormDefaults(
  source?: Partial<{
    clientId: string | null;
    vehicleId: string | null;
    date: string | null;
    time: string | null;
    type: AppointmentInput["type"] | null;
    status: AppointmentInput["status"] | null;
    notes: string | null;
  }>,
): AppointmentFormValues {
  return {
    clientId: source?.clientId ?? "",
    vehicleId: source?.vehicleId ?? "",
    date: source?.date ?? new Date().toISOString().slice(0, 10),
    time: source?.time ?? "08:00",
    type: source?.type ?? "ingreso_servicio",
    status: source?.status ?? "pendiente",
    notes: source?.notes ?? "",
  };
}
