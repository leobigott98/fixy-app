import { z } from "zod";

import { staffInviteRoleOptions, type WorkshopRole } from "@/lib/permissions";

const inviteRoles = staffInviteRoleOptions.map((option) => option.value) as [
  Exclude<WorkshopRole, "owner" | "admin">,
  ...Exclude<WorkshopRole, "owner" | "admin">[],
];

export const workshopTeamInviteSchema = z
  .object({
    fullName: z.string().trim().min(2, "Ingresa el nombre del integrante."),
    role: z.enum(inviteRoles, "Selecciona un rol."),
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    mechanicId: z.string().trim().optional(),
    message: z.string().trim().max(240, "Usa un mensaje mas corto.").optional(),
  })
  .superRefine((values, ctx) => {
    const hasEmail = Boolean(values.email?.trim());
    const hasPhone = Boolean(values.phone?.trim());

    if (!hasEmail && !hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agrega correo o telefono para invitar.",
        path: ["email"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agrega correo o telefono para invitar.",
        path: ["phone"],
      });
    }

    if (hasEmail && !z.string().email().safeParse(values.email?.trim()).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa un correo valido.",
        path: ["email"],
      });
    }
  });

export type WorkshopTeamInviteValues = z.infer<typeof workshopTeamInviteSchema>;

export function buildWorkshopTeamInviteDefaults(): WorkshopTeamInviteValues {
  return {
    fullName: "",
    role: "mechanic",
    email: "",
    phone: "",
    mechanicId: "",
    message: "",
  };
}
