"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin?.startsWith("http://") || origin?.startsWith("https://")) {
    return origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return null;
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  return `${protocol}://${host}`;
}

function getInviteMessage(result: Awaited<ReturnType<typeof inviteWorkshopMember>>) {
  if (result.kind === "updated") {
    return "Acceso del integrante actualizado.";
  }

  const prefix =
    result.kind === "resent"
      ? "Invitacion actualizada."
      : "Invitacion guardada.";

  if (result.delivery === "email_invite_sent") {
    return `${prefix} Enviamos un correo para que la persona active su acceso y defina su contrasena.`;
  }

  if (result.delivery === "password_setup_sent") {
    return `${prefix} Esa cuenta ya existia, asi que enviamos un correo para definir una nueva contrasena.`;
  }

  if (result.delivery === "sms_ready") {
    return `${prefix} La persona podra entrar con codigo SMS si el proveedor de SMS esta configurado.`;
  }

  return result.deliveryError
    ? `${prefix} No se pudo enviar el correo de acceso: ${result.deliveryError}`
    : `${prefix} La persona podra entrar con su correo o telefono.`;
}

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
      origin: await getRequestOrigin(),
    });

    revalidatePath("/app/settings");
    revalidatePath("/app/mechanics");

    return {
      success: true,
      message: getInviteMessage(result),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar la invitacion.",
    };
  }
}
