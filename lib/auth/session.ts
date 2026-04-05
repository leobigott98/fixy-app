import { redirect } from "next/navigation";

import {
  getDisplayNameFromIdentifier,
} from "@/lib/auth/session-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppSession = {
  user: {
    id: string;
    loginIdentifier: string;
    email: string | null;
    phone: string | null;
    name: string;
    role: string;
    accountType: "workshop" | "car_owner" | null;
    factors: Array<{
      id: string;
      factor_type: string;
      status: string;
      friendly_name?: string;
    }>;
    aal: {
      currentLevel: string | null;
      nextLevel: string | null;
    };
  };
};

export async function getAppSession(): Promise<AppSession | null> {
  const supabase = await createSupabaseServerClient();
  const [{ data: userData, error: userError }, { data: aalData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  if (userError) {
    throw userError;
  }

  const user = userData.user;

  if (!user) {
    return null;
  }

  const email = user.email ?? null;
  const phone = user.phone ?? null;
  const loginIdentifier = email ?? phone ?? "";

  return {
    user: {
      id: user.id,
      loginIdentifier,
      email,
      phone,
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        getDisplayNameFromIdentifier(loginIdentifier),
      role:
        user.user_metadata?.account_type === "car_owner"
          ? "Propietario de vehiculo"
          : "Equipo",
      accountType:
        user.user_metadata?.account_type === "car_owner"
          ? "car_owner"
          : user.user_metadata?.account_type === "workshop"
            ? "workshop"
            : null,
      factors:
        user.factors?.map((factor) => ({
          id: factor.id,
          factor_type: factor.factor_type,
          status: factor.status,
          friendly_name: factor.friendly_name,
        })) ?? [],
      aal: {
        currentLevel: aalData?.currentLevel ?? null,
        nextLevel: aalData?.nextLevel ?? null,
      },
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
