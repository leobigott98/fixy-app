import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sessionCookieName } from "@/lib/auth/constants";
import {
  getDisplayNameFromIdentifier,
  isEmailIdentifier,
  parseSessionCookieValue,
} from "@/lib/auth/session-utils";

export type AppSession = {
  user: {
    loginIdentifier: string;
    email: string | null;
    phone: string | null;
    name: string;
    role: string;
  };
};

export async function getAppSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName);

  if (!sessionCookie?.value) {
    return null;
  }

  const loginIdentifier = parseSessionCookieValue(sessionCookie.value);
  const email = isEmailIdentifier(loginIdentifier) ? loginIdentifier : null;
  const phone = email ? null : loginIdentifier;

  return {
    user: {
      loginIdentifier,
      email,
      phone,
      name: getDisplayNameFromIdentifier(loginIdentifier),
      role: "Equipo",
    },
  };
}

export async function requireAppSession() {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
