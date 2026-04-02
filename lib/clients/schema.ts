import { z } from "zod";

export const clientProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre completo."),
  phone: z.string().trim(),
  whatsappPhone: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Ingresa un correo valido.",
    ),
  notes: z.string().trim(),
});

export type ClientProfileInput = z.infer<typeof clientProfileSchema>;
