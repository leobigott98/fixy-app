export type AuthNoticeTone = "error" | "success" | "info";

export type AuthNotice = {
  tone: AuthNoticeTone;
  message: string;
};

const authQueryNoticeMap: Record<string, AuthNotice> = {
  "expired-link": {
    tone: "error",
    message: "Ese enlace ya vencio o ya fue usado. Solicita uno nuevo.",
  },
  "invalid-link": {
    tone: "error",
    message: "El enlace de acceso no es valido. Solicita uno nuevo.",
  },
  "missing-link": {
    tone: "error",
    message: "Falta informacion en el enlace de acceso. Solicita uno nuevo.",
  },
  "recovery-link-expired": {
    tone: "error",
    message: "El enlace para cambiar tu contrasena vencio o ya fue usado. Pide otro.",
  },
  "check-email": {
    tone: "success",
    message: "Revisa tu correo y abre el enlace mas reciente.",
  },
  "reset-ready": {
    tone: "info",
    message: "Tu sesion de recuperacion esta lista. Define tu nueva contrasena.",
  },
};

export function getAuthNoticeFromQueryKey(key: string | null): AuthNotice | null {
  if (!key) {
    return null;
  }

  return authQueryNoticeMap[key] ?? null;
}

export function normalizeAuthMessage(rawMessage: string): AuthNotice {
  const message = rawMessage.trim();
  const lower = message.toLowerCase();

  if (!message) {
    return {
      tone: "info",
      message: "Revisa el estado de tu acceso e intenta de nuevo.",
    };
  }

  if (lower.includes("rate limit") || lower.includes("security purposes")) {
    return {
      tone: "error",
      message: "Ya se solicitaron demasiados intentos seguidos. Espera un momento antes de reenviar.",
    };
  }

  if (lower.includes("invalid login credentials")) {
    return {
      tone: "error",
      message: "Ese correo, telefono o contrasena no coincide con una cuenta activa.",
    };
  }

  if (lower.includes("email not confirmed")) {
    return {
      tone: "error",
      message: "Todavia falta confirmar tu correo. Abre el enlace mas reciente que te enviamos.",
    };
  }

  if (
    lower.includes("otp") && lower.includes("expired") ||
    lower.includes("token has expired") ||
    lower.includes("expired or invalid") ||
    lower.includes("flow state has expired")
  ) {
    return {
      tone: "error",
      message: "Ese codigo o enlace ya vencio. Solicita uno nuevo para continuar.",
    };
  }

  if (
    lower.includes("token has invalid") ||
    lower.includes("invalid token") ||
    lower.includes("token is invalid") ||
    lower.includes("token is expired")
  ) {
    return {
      tone: "error",
      message: "El enlace o codigo ya no es valido. Solicita uno nuevo.",
    };
  }

  if (lower.includes("password should be at least")) {
    return {
      tone: "error",
      message: "Tu contrasena debe tener al menos 8 caracteres.",
    };
  }

  if (lower.includes("unable to validate email address")) {
    return {
      tone: "error",
      message: "Ese correo no parece valido. Revísalo e intenta otra vez.",
    };
  }

  if (lower.includes("user already registered")) {
    return {
      tone: "error",
      message: "Ya existe una cuenta con ese acceso. Prueba iniciar sesion.",
    };
  }

  if (lower.includes("phone provider is not configured")) {
    return {
      tone: "error",
      message: "El acceso por SMS no esta configurado todavia en este entorno.",
    };
  }

  return {
    tone: lower.includes("error") || lower.includes("invalid") ? "error" : "info",
    message,
  };
}
