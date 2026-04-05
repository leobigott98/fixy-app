import { z } from "zod";

export const ownerPreferredContactOptions = ["whatsapp", "llamada", "correo"] as const;
export const ownerCurrencyOptions = ["USD", "VES", "USD_VES"] as const;

export const ownerProfileFormSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
  phone: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D+/g, "").length >= 7, "Ingresa un telefono valido."),
  city: z.string().trim().max(80, "Usa una ciudad corta."),
  avatarUrl: z.string().trim(),
  preferredContact: z.enum(ownerPreferredContactOptions, "Selecciona el contacto preferido."),
});

export type OwnerProfileFormValues = z.infer<typeof ownerProfileFormSchema>;

export const ownerVehicleFormSchema = z.object({
  nickname: z.string().trim().max(60, "Usa un nombre corto."),
  plate: z.string().trim().max(20, "Usa una placa corta."),
  make: z.string().trim().min(2, "Ingresa la marca."),
  model: z.string().trim().min(1, "Ingresa el modelo."),
  year: z.string().trim(),
  color: z.string().trim().max(40, "Usa un color corto."),
  mileage: z.string().trim(),
  vin: z.string().trim().max(40, "Usa un VIN corto."),
  notes: z.string().trim().max(600, "Mantén las notas en 600 caracteres o menos."),
  photoUrls: z.array(z.string().url("Sube una foto valida.")).max(12, "Maximo 12 fotos."),
});

export type OwnerVehicleFormValues = z.infer<typeof ownerVehicleFormSchema>;

export const ownerAppointmentFormSchema = z.object({
  workshopSlug: z.string().trim().min(1, "Selecciona un taller."),
  ownerVehicleId: z.string().uuid("Selecciona un carro."),
  requestedDate: z.string().trim().min(1, "Selecciona la fecha."),
  requestedTime: z
    .string()
    .trim()
    .refine((value) => /^\d{2}:\d{2}$/.test(value), "Selecciona una hora valida."),
  serviceNeeded: z.string().trim().min(2, "Describe el servicio."),
  issueSummary: z
    .string()
    .trim()
    .min(10, "Agrega mas contexto.")
    .max(500, "Mantén el mensaje en 500 caracteres o menos."),
  contactChannel: z.enum(ownerPreferredContactOptions, "Selecciona un canal de contacto."),
});

export type OwnerAppointmentFormValues = z.infer<typeof ownerAppointmentFormSchema>;

export const ownerServiceRecordFormSchema = z.object({
  ownerVehicleId: z.string().uuid("Selecciona un carro."),
  workshopSlug: z.string().trim(),
  workshopName: z.string().trim().min(2, "Ingresa el taller."),
  mechanicName: z.string().trim().max(80, "Usa un nombre corto."),
  serviceDate: z.string().trim().min(1, "Selecciona la fecha."),
  deliveredAt: z.string().trim(),
  serviceType: z.string().trim().min(2, "Resume el servicio."),
  description: z
    .string()
    .trim()
    .min(10, "Describe el trabajo realizado.")
    .max(600, "Mantén la descripcion en 600 caracteres o menos."),
  partsUsed: z.string().trim(),
  totalCost: z.string().trim(),
  currency: z.enum(ownerCurrencyOptions, "Selecciona la moneda."),
  durationHours: z.string().trim(),
  notes: z.string().trim().max(600, "Mantén las notas en 600 caracteres o menos."),
  photoUrls: z.array(z.string().url("Sube una foto valida.")).max(12, "Maximo 12 fotos."),
});

export type OwnerServiceRecordFormValues = z.infer<typeof ownerServiceRecordFormSchema>;

export const ownerReviewFormSchema = z.object({
  workshopId: z.string().uuid("Selecciona un taller."),
  ownerVehicleId: z.string().uuid("Selecciona un carro."),
  title: z.string().trim().min(3, "Agrega un titulo corto.").max(80, "Usa un titulo mas corto."),
  rating: z
    .number({ error: "Selecciona una calificacion." })
    .int("Selecciona una calificacion valida.")
    .min(1, "Selecciona minimo 1 estrella.")
    .max(5, "Selecciona maximo 5 estrellas."),
  comment: z
    .string()
    .trim()
    .min(10, "Comparte mas contexto sobre tu experiencia.")
    .max(500, "Mantén tu comentario en 500 caracteres o menos."),
});

export type OwnerReviewFormValues = z.infer<typeof ownerReviewFormSchema>;

function normalizeNumericString(value: string) {
  const normalized = value.replace(",", ".").trim();
  return normalized ? Number(normalized) : null;
}

export function normalizeOwnerVehicleInput(values: OwnerVehicleFormValues) {
  return {
    nickname: values.nickname || null,
    plate: values.plate || null,
    make: values.make,
    model: values.model,
    vehicleYear: values.year ? Number(values.year) : null,
    color: values.color || null,
    mileage: values.mileage ? Number(values.mileage) : null,
    vin: values.vin || null,
    notes: values.notes || null,
    photoUrls: values.photoUrls,
  };
}

export function normalizeOwnerServiceRecordInput(values: OwnerServiceRecordFormValues) {
  return {
    ownerVehicleId: values.ownerVehicleId,
    workshopSlug: values.workshopSlug || null,
    workshopName: values.workshopName,
    mechanicName: values.mechanicName || null,
    serviceDate: values.serviceDate,
    deliveredAt: values.deliveredAt || null,
    serviceType: values.serviceType,
    description: values.description,
    partsUsed: values.partsUsed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    totalCost: normalizeNumericString(values.totalCost) ?? 0,
    currency: values.currency,
    durationHours: normalizeNumericString(values.durationHours),
    notes: values.notes || null,
    photoUrls: values.photoUrls,
  };
}

export function buildOwnerProfileDefaults(source?: Partial<OwnerProfileFormValues>): OwnerProfileFormValues {
  return {
    fullName: source?.fullName ?? "",
    phone: source?.phone ?? "",
    city: source?.city ?? "",
    avatarUrl: source?.avatarUrl ?? "",
    preferredContact: source?.preferredContact ?? "whatsapp",
  };
}

export function buildOwnerVehicleDefaults(
  source?: Partial<OwnerVehicleFormValues>,
): OwnerVehicleFormValues {
  return {
    nickname: source?.nickname ?? "",
    plate: source?.plate ?? "",
    make: source?.make ?? "",
    model: source?.model ?? "",
    year: source?.year ?? "",
    color: source?.color ?? "",
    mileage: source?.mileage ?? "",
    vin: source?.vin ?? "",
    notes: source?.notes ?? "",
    photoUrls: source?.photoUrls ?? [],
  };
}

export function buildOwnerAppointmentDefaults(
  source?: Partial<OwnerAppointmentFormValues>,
): OwnerAppointmentFormValues {
  return {
    workshopSlug: source?.workshopSlug ?? "",
    ownerVehicleId: source?.ownerVehicleId ?? "",
    requestedDate: source?.requestedDate ?? new Date().toISOString().slice(0, 10),
    requestedTime: source?.requestedTime ?? "08:00",
    serviceNeeded: source?.serviceNeeded ?? "",
    issueSummary: source?.issueSummary ?? "",
    contactChannel: source?.contactChannel ?? "whatsapp",
  };
}

export function buildOwnerServiceRecordDefaults(
  source?: Partial<OwnerServiceRecordFormValues>,
): OwnerServiceRecordFormValues {
  return {
    ownerVehicleId: source?.ownerVehicleId ?? "",
    workshopSlug: source?.workshopSlug ?? "",
    workshopName: source?.workshopName ?? "",
    mechanicName: source?.mechanicName ?? "",
    serviceDate: source?.serviceDate ?? new Date().toISOString().slice(0, 10),
    deliveredAt: source?.deliveredAt ?? "",
    serviceType: source?.serviceType ?? "",
    description: source?.description ?? "",
    partsUsed: source?.partsUsed ?? "",
    totalCost: source?.totalCost ?? "",
    currency: source?.currency ?? "USD",
    durationHours: source?.durationHours ?? "",
    notes: source?.notes ?? "",
    photoUrls: source?.photoUrls ?? [],
  };
}
