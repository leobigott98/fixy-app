import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function isMissingRelationError(error: { code?: string } | null) {
  return error?.code === "42P01";
}

export async function createSupabaseDataClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseAdminClient();
  }

  return createSupabaseServerClient();
}
