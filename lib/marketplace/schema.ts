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

export const marketplaceReviewSchema = z.object({
  reviewerName: z.string().trim().min(2, "Ingresa tu nombre."),
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

export type MarketplaceReviewInput = z.infer<typeof marketplaceReviewSchema>;

export const workshopReviewResponseSchema = z.object({
  response: z
    .string()
    .trim()
    .min(6, "Agrega una respuesta breve pero util.")
    .max(500, "Mantén la respuesta en 500 caracteres o menos."),
});

export type WorkshopReviewResponseInput = z.infer<typeof workshopReviewResponseSchema>;
