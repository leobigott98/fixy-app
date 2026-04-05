"use server";

import { revalidatePath } from "next/cache";

import { inviteWorkshopMember } from "@/lib/data/workshops";
import {
  workshopTeamInviteSchema,
  type WorkshopTeamInviteValues,
} from "@/lib/team/schema";

type InviteWorkshopTeamResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function inviteWorkshopMemberAction(
  values: WorkshopTeamInviteValues,
): Promise<InviteWorkshopTeamResult> {
  const parsed = workshopTeamInviteSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa la invitacion antes de enviarla.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await inviteWorkshopMember({
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      email: parsed.data.email,
      phone: parsed.data.phone,
      mechanicId: parsed.data.mechanicId || null,
      message: parsed.data.message,
    });

    revalidatePath("/app/settings");
    revalidatePath("/app/mechanics");

    return {
      success: true,
      message:
        result.kind === "updated"
          ? "Acceso del integrante actualizado."
          : "Invitacion guardada. La persona podra entrar con su correo o telefono.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar la invitacion.",
    };
  }
}
