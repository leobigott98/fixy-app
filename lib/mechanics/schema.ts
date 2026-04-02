import { z } from "zod";

import { mechanicRoleOptions, type MechanicRole } from "@/lib/mechanics/constants";

export const mechanicProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre del integrante."),
  phone: z.string().trim(),
  role: z.enum(
    mechanicRoleOptions.map((option) => option.value) as [MechanicRole, ...MechanicRole[]],
    "Selecciona un rol.",
  ),
  isActive: z.boolean(),
  notes: z.string().trim().max(500, "Usa una nota mas corta."),
  photoUrl: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\//.test(value), "Sube una foto valida."),
});

export type MechanicProfileValues = z.infer<typeof mechanicProfileSchema>;

export function buildMechanicFormDefaults(source?: {
  fullName?: string;
  phone?: string | null;
  role?: MechanicRole;
  isActive?: boolean;
  notes?: string | null;
  photoUrl?: string | null;
}): MechanicProfileValues {
  return {
    fullName: source?.fullName ?? "",
    phone: source?.phone ?? "",
    role: source?.role ?? "mecanico",
    isActive: source?.isActive ?? true,
    notes: source?.notes ?? "",
    photoUrl: source?.photoUrl ?? "",
  };
}
