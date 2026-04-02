import "server-only";

import { cookies } from "next/headers";

import { listViewCookieName } from "@/lib/view-preference-constants";

export async function getPreferredListView(
  requestedView?: string,
  fallback: "cards" | "table" = "cards",
) {
  if (requestedView === "cards" || requestedView === "table") {
    return requestedView;
  }

  const value = (await cookies()).get(listViewCookieName)?.value;
  return value === "cards" || value === "table" ? value : fallback;
}

export async function getPreferredWorkOrdersView(requestedView?: string) {
  if (requestedView === "board" || requestedView === "cards" || requestedView === "table") {
    return requestedView;
  }

  return getPreferredListView(undefined, "cards");
}
