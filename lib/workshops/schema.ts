import { z } from "zod";

import {
  currencyDisplayValues,
  openingDaysOptions,
  workshopTypeOptions,
} from "@/lib/workshops/constants";

export const workshopProfileSchema = z.object({
  workshopName: z.string().min(2, "Ingresa el nombre del taller."),
  ownerName: z.string().min(2, "Ingresa el nombre del encargado."),
  whatsappPhone: z.string().min(7, "Ingresa un telefono valido."),
  city: z.string().min(2, "Ingresa ciudad o zona."),
  workshopType: z.enum(workshopTypeOptions, "Selecciona el tipo de taller."),
  openingDays: z.enum(openingDaysOptions, "Selecciona los dias de trabajo."),
  opensAt: z.string().min(1, "Indica hora de apertura."),
  closesAt: z.string().min(1, "Indica hora de cierre."),
  bayCount: z.number().int().min(1, "Debe haber al menos un puesto."),
  logoUrl: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\//.test(value), "Sube un logo valido."),
  currencyDisplay: z.enum(currencyDisplayValues, "Selecciona una moneda."),
});

export type WorkshopProfileInput = z.infer<typeof workshopProfileSchema>;

export function buildOpeningHoursLabel(
  input: Pick<WorkshopProfileInput, "openingDays" | "opensAt" | "closesAt">,
) {
  return `${input.openingDays} - ${input.opensAt} a ${input.closesAt}`;
}
