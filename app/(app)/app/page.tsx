import type { Route } from "next";
import { redirect } from "next/navigation";

import { requireAppSession } from "@/lib/auth/session";
import { getCurrentCarOwnerProfile } from "@/lib/data/car-owners";
import { getCurrentWorkshop } from "@/lib/data/workshops";

export default async function AppIndexPage() {
  const session = await requireAppSession();
  const workshop = await getCurrentWorkshop();
  const ownerProfile = await getCurrentCarOwnerProfile();

  if (workshop) {
    redirect("/app/dashboard" as Route);
  }

  if (ownerProfile) {
    redirect("/app/garage" as Route);
  }

  redirect((session.user.accountType === "car_owner" ? "/app/owner/onboarding" : "/app/onboarding") as Route);
}
