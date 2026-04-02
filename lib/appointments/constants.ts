export const appointmentStatusOptions = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmada", label: "Confirmada" },
  { value: "completada", label: "Completada" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export const appointmentTypeOptions = [
  { value: "ingreso_servicio", label: "Ingreso de servicio" },
  { value: "visita_taller", label: "Visita al taller" },
] as const;

export type AppointmentStatus = (typeof appointmentStatusOptions)[number]["value"];
export type AppointmentType = (typeof appointmentTypeOptions)[number]["value"];

export function getAppointmentStatusLabel(status: AppointmentStatus | string) {
  return appointmentStatusOptions.find((option) => option.value === status)?.label ?? status;
}

export function getAppointmentTypeLabel(type: AppointmentType | string) {
  return appointmentTypeOptions.find((option) => option.value === type)?.label ?? type;
}
