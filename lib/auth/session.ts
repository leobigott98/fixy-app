import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AppSession = {
  user: {
    name: string;
    role: string;
    workshopName: string;
  };
};

const SESSION_COOKIE = "fixy_session";

export async function getAppSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

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

export const sessionCookieName = SESSION_COOKIE;
