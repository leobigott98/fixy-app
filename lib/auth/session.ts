import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sessionCookieName } from "@/lib/auth/constants";
import { getDisplayNameFromEmail, parseSessionCookieValue } from "@/lib/auth/session-utils";

export type AppSession = {
  user: {
    email: string;
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

  const email = parseSessionCookieValue(sessionCookie.value);

  return {
    user: {
      email,
      name: getDisplayNameFromEmail(email),
      role: "Encargado",
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
