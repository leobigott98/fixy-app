import { z } from "zod";

import { workshopServiceOptions } from "@/lib/workshops/constants";

export const marketplacePreferredContactOptions = ["whatsapp", "llamada"] as const;
export const marketplaceInquiryServiceOptions = [...workshopServiceOptions, "Otro"] as const;

export const marketplaceInquirySchema = z.object({
  requesterName: z.string().trim().min(2, "Ingresa tu nombre."),
  requesterPhone: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D+/g, "").length >= 7, "Ingresa un telefono valido."),
  requesterCity: z.string().trim().max(80, "Usa una ubicacion corta."),
  requestedService: z.enum(
    marketplaceInquiryServiceOptions,
    "Selecciona el servicio que necesitas.",
  ),
  vehicleReference: z.string().trim().max(100, "Usa una referencia corta del vehiculo."),
  preferredContact: z.enum(
    marketplacePreferredContactOptions,
    "Selecciona como prefieres ser contactado.",
  ),
  message: z
    .string()
    .trim()
    .min(10, "Describe brevemente lo que necesitas.")
    .max(500, "Mantén la solicitud en 500 caracteres o menos."),
});

export type MarketplaceInquiryInput = z.infer<typeof marketplaceInquirySchema>;
