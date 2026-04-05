"use server";

import { prepareAuthAccessForIdentifier } from "@/lib/data/workshops";
import { normalizeLoginIdentifier } from "@/lib/auth/session-utils";

export async function prepareOtpAccessAction(identifier: string) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (!normalizedIdentifier) {
    return {
      success: false,
      message: "Ingresa un correo o telefono valido.",
    };
  }

  try {
    await prepareAuthAccessForIdentifier(normalizedIdentifier);

    return {
      success: true,
      identifier: normalizedIdentifier,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo preparar el acceso.",
    };
  }
}
