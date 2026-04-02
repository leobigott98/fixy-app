import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAppSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildOpeningHoursLabel, type WorkshopProfileInput } from "@/lib/workshops/schema";

export type WorkshopRecord = {
  id: string;
  owner_email: string;
  owner_name: string;
  workshop_name: string;
  whatsapp_phone: string;
  city: string;
  workshop_type: string;
  opening_days: string;
  opens_at: string;
  closes_at: string;
  opening_hours_label: string;
  bay_count: number;
  logo_url: string | null;
  preferred_currency: "USD" | "VES" | "USD_VES";
  created_at: string;
  updated_at: string;
};

type DashboardStats = {
  activeWorkOrders: number;
  pendingQuotes: number;
  collectedThisPeriod: number;
  pendingServices: number;
  recentOrders: Array<{
    id: string;
    title: string;
    status: string;
    vehicleLabel: string | null;
    promisedDate: string | null;
    totalAmount: number;
  }>;
};

type RecentOrderRow = {
  id: string;
  title: string;
  status: string;
  vehicle_label: string | null;
  promised_date: string | null;
  total_amount: number | string | null;
};

type PaymentRow = {
  amount: number | string | null;
};

function isMissingRelationError(error: { code?: string } | null) {
  return error?.code === "42P01";
}

function formatDashboardStatus(status: string) {
  switch (status) {
    case "received":
      return "Recibido";
    case "diagnosis":
      return "Diagnostico";
    case "in_progress":
      return "En proceso";
    case "waiting_parts":
      return "Esperando repuesto";
    case "ready":
      return "Listo";
    case "delivered":
      return "Entregado";
    default:
      return status;
  }
}

async function createSupabaseDataClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseAdminClient();
  }

  return createSupabaseServerClient();
}

export async function getCurrentWorkshop() {
  const session = await getAppSession();

  if (!session) {
    return null;
  }

  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("owner_email", session.user.email)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return (data as WorkshopRecord | null) ?? null;
}

export async function requireCurrentWorkshop() {
  const workshop = await getCurrentWorkshop();

  if (!workshop) {
    redirect("/app/onboarding" as Route);
  }

  return workshop;
}

export async function upsertCurrentWorkshop(input: WorkshopProfileInput) {
  const session = await getAppSession();

  if (!session) {
    throw new Error("Sesion no disponible.");
  }

  const payload = {
    owner_email: session.user.email,
    owner_name: input.ownerName,
    workshop_name: input.workshopName,
    whatsapp_phone: input.whatsappPhone,
    city: input.city,
    workshop_type: input.workshopType,
    opening_days: input.openingDays,
    opens_at: input.opensAt,
    closes_at: input.closesAt,
    opening_hours_label: buildOpeningHoursLabel(input),
    bay_count: input.bayCount,
    logo_url: input.logoUrl ?? null,
    preferred_currency: input.currencyDisplay,
  };

  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshops")
    .upsert(payload, { onConflict: "owner_email" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as WorkshopRecord;
}

export async function getDashboardStats(workshopId: string): Promise<DashboardStats> {
  const supabase = await createSupabaseDataClient();

  const [
    activeWorkOrdersResult,
    pendingQuotesResult,
    pendingServicesResult,
    recentOrdersResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("workshop_id", workshopId)
      .in("status", ["received", "diagnosis", "in_progress", "waiting_parts", "ready"]),
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("workshop_id", workshopId)
      .in("status", ["draft", "sent"]),
    supabase
      .from("work_orders")
      .select("*", { count: "exact", head: true })
      .eq("workshop_id", workshopId)
      .in("status", ["received", "diagnosis", "waiting_parts"]),
    supabase
      .from("work_orders")
      .select("id,title,status,vehicle_label,promised_date,total_amount")
      .eq("workshop_id", workshopId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("amount")
      .eq("workshop_id", workshopId)
      .gte("paid_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);

  const results = [
    activeWorkOrdersResult.error,
    pendingQuotesResult.error,
    pendingServicesResult.error,
    recentOrdersResult.error,
    paymentsResult.error,
  ];

  const nonMissingError = results.find((error) => error && !isMissingRelationError(error));

  if (nonMissingError) {
    throw nonMissingError;
  }

  return {
    activeWorkOrders: activeWorkOrdersResult.count ?? 0,
    pendingQuotes: pendingQuotesResult.count ?? 0,
    pendingServices: pendingServicesResult.count ?? 0,
    collectedThisPeriod:
      ((paymentsResult.data as PaymentRow[] | null)?.reduce(
        (total, payment) => total + Number(payment.amount ?? 0),
        0,
      ) ?? 0),
    recentOrders:
      ((recentOrdersResult.data as RecentOrderRow[] | null)?.map((order) => ({
        id: order.id,
        title: order.title,
        status: formatDashboardStatus(order.status),
        vehicleLabel: order.vehicle_label,
        promisedDate: order.promised_date,
        totalAmount: Number(order.total_amount ?? 0),
      })) ?? []),
  };
}
