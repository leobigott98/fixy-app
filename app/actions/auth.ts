"use server";

import { cookies } from "next/headers";

import { sessionCookieName } from "@/lib/auth/constants";
import {
  buildSessionCookieValue,
  isEmailIdentifier,
  normalizeLoginIdentifier,
} from "@/lib/auth/session-utils";
import { acceptWorkshopInviteForIdentifier } from "@/lib/data/workshops";

type AuthResult =
  | {
      success: true;
      message: string;
      redirectTo: string;
    }
  | {
      success: false;
      message: string;
    };

function persistSession(identifier: string) {
  return cookies().then((cookieStore) =>
    cookieStore.set(sessionCookieName, buildSessionCookieValue(identifier), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    }),
  );
}

export async function loginAction(values: {
  identifier: string;
  password: string;
}): Promise<AuthResult> {
  const identifier = normalizeLoginIdentifier(values.identifier);

  if (!identifier || values.password.trim().length < 6) {
    return {
      success: false,
      message: "Ingresa tu correo o telefono y una clave valida.",
    };
  }

  await acceptWorkshopInviteForIdentifier(identifier);
  await persistSession(identifier);

  return {
    success: true,
    message: isEmailIdentifier(identifier)
      ? "Acceso activado para tu correo."
      : "Acceso activado para tu telefono.",
    redirectTo: "/app",
  };
}

export async function signupAction(values: {
  email: string;
  password: string;
  workshopName?: string;
  name?: string;
}): Promise<AuthResult> {
  const email = normalizeLoginIdentifier(values.email);

  if (!isEmailIdentifier(email) || values.password.trim().length < 6) {
    return {
      success: false,
      message: "Usa un correo valido y una clave de al menos 6 caracteres.",
    };
  }

  await persistSession(email);

  const params = new URLSearchParams();

  if (values.name?.trim()) {
    params.set("ownerName", values.name.trim());
  }

  if (values.workshopName?.trim()) {
    params.set("workshopName", values.workshopName.trim());
  }

  return {
    success: true,
    message: "Cuenta base creada. Completa ahora la configuracion del taller.",
    redirectTo: `/app/onboarding?${params.toString()}`,
  };
}

export async function forgotPasswordAction(values: {
  identifier: string;
}): Promise<AuthResult> {
  const identifier = normalizeLoginIdentifier(values.identifier);

  if (!identifier) {
    return {
      success: false,
      message: "Ingresa un correo o telefono valido.",
    };
  }

  return {
    success: true,
    message: `Enlace enviado a ${values.identifier}. La recuperacion real se conecta en la siguiente capa de auth.`,
    redirectTo: "/login",
  };
}
