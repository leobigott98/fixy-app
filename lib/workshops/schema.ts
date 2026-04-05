import { z } from "zod";

import {
  currencyDisplayValues,
  openingDaysOptions,
  publicProfileVisibilityValues,
  workshopTypeOptions,
  workshopServiceOptions,
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
  galleryImageUrls: z
    .array(
      z
        .string()
        .trim()
        .refine((value) => value.length > 0 && /^https?:\/\//.test(value), "Sube una imagen valida."),
    )
    .max(8, "Sube hasta 8 fotos del taller."),
  currencyDisplay: z.enum(currencyDisplayValues, "Selecciona una moneda."),
  publicDescription: z
    .string()
    .trim()
    .max(320, "Usa una descripcion corta y clara para el perfil publico."),
  publicAddress: z.string().trim().max(180, "La direccion no debe exceder 180 caracteres."),
  publicContactPhone: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || value.replace(/\D+/g, "").length >= 7,
      "Ingresa un telefono publico valido.",
    ),
  publicContactEmail: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || z.string().email().safeParse(value).success,
      "Ingresa un correo valido.",
    ),
  publicSlug: z
    .string()
    .trim()
    .max(48, "Usa un slug corto para el perfil publico.")
    .refine(
      (value) => value.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      "Usa solo letras minusculas, numeros y guiones.",
    ),
  publicServices: z
    .array(z.enum(workshopServiceOptions))
    .min(1, "Selecciona al menos un servicio visible.")
    .max(8, "Selecciona hasta 8 servicios visibles."),
  profileVisibility: z.enum(
    publicProfileVisibilityValues,
    "Selecciona la visibilidad del perfil.",
  ),
});

export type WorkshopProfileInput = z.infer<typeof workshopProfileSchema>;

export function buildOpeningHoursLabel(
  input: Pick<WorkshopProfileInput, "openingDays" | "opensAt" | "closesAt">,
) {
  return `${input.openingDays} - ${input.opensAt} a ${input.closesAt}`;
}

export function slugifyWorkshopPublicSlug(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.slice(0, 48) || "taller-fixy";
}

export function buildWorkshopPublicPath(slug: string) {
  return `/talleres/${slugifyWorkshopPublicSlug(slug)}`;
}
