import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sessionCookieName } from "@/lib/auth/constants";

export type AppSession = {
  user: {
    name: string;
    role: string;
    workshopName: string;
  };
};

export async function getAppSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName);

  if (!sessionCookie?.value) {
    return null;
  }

  return {
    user: {
      name: "Luis Mendoza",
      role: "Encargado",
      workshopName: "Fixy Garage",
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
