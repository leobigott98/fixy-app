import type { Route } from "next";
import { redirect } from "next/navigation";

import { getCurrentWorkshop } from "@/lib/data/workshops";

export default async function AppIndexPage() {
  const workshop = await getCurrentWorkshop();

  if (workshop) {
    redirect("/app/dashboard" as Route);
  }

  redirect("/app/onboarding" as Route);
}
