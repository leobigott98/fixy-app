import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAppSession } from "@/lib/auth/session";
import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import type { WorkshopRole } from "@/lib/permissions";
import {
  buildOpeningHoursLabel,
  slugifyWorkshopPublicSlug,
  type WorkshopProfileInput,
} from "@/lib/workshops/schema";

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
  gallery_image_urls: string[] | null;
  preferred_currency: "USD" | "VES" | "USD_VES";
  public_description: string | null;
  public_address: string | null;
  public_contact_phone: string | null;
  public_contact_email: string | null;
  public_slug: string | null;
  public_services: string[] | null;
  profile_visibility: "private" | "public";
  verification_status: "not_requested" | "pending" | "verified";
  created_at: string;
  updated_at: string;
};

export type WorkshopMemberRecord = {
  id: string;
  workshop_id: string;
  email: string;
  full_name: string;
  role: WorkshopRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CurrentWorkshopAccess = {
  workshop: WorkshopRecord;
  role: WorkshopRole;
  member: WorkshopMemberRecord | null;
};

type DashboardStats = {
  activeWorkOrders: number;
  pendingQuotes: number;
  collectedThisPeriod: number;
  pendingServices: number;
  completedOrders: number;
  averageTicket: number;
  recentOrders: Array<{
    id: string;
    title: string;
    status: string;
    vehicleLabel: string | null;
    promisedDate: string | null;
    totalAmount: number;
  }>;
  analytics: {
    workOrdersByStatus: Array<{
      label: string;
      value: number;
      color: string;
    }>;
    quotesByStatus: Array<{
      label: string;
      value: number;
      color: string;
    }>;
    cashflowTrend: Array<{
      label: string;
      collected: number;
      expenses: number;
    }>;
  };
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
  status?: string | null;
  paid_at?: string | null;
};

type ExpenseRow = {
  amount: number | string | null;
  spent_at: string | null;
};

type WorkOrderAnalyticsRow = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number | string | null;
};

type QuoteAnalyticsRow = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number | string | null;
};

type WorkshopSlugLookupRecord = {
  id: string;
  public_slug: string | null;
};

function getMonthSeries(months: number) {
  const now = new Date();

  return Array.from({ length: months }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    return {
      key,
      label: date.toLocaleDateString("es-VE", { month: "short" }),
    };
  });
}

function getMonthKey(dateValue: string | null | undefined) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getWorkOrderStatusColor(status: string) {
  switch (status) {
    case "en_reparacion":
      return "#f97316";
    case "diagnostico_pendiente":
      return "#0f766e";
    case "listo_para_entrega":
      return "#15803d";
    case "presupuesto_pendiente":
      return "#334155";
    case "completada":
      return "#1d4ed8";
    case "cancelada":
      return "#b42318";
    default:
      return "#94a3b8";
  }
}

function getQuoteStatusColor(status: string) {
  switch (status) {
    case "draft":
      return "#334155";
    case "sent":
      return "#0f766e";
    case "approved":
      return "#15803d";
    case "rejected":
      return "#b42318";
    case "expired":
      return "#f97316";
    default:
      return "#94a3b8";
  }
}

function formatDashboardStatus(status: string) {
  switch (status) {
    case "presupuesto_pendiente":
      return "Presupuesto pendiente";
    case "diagnostico_pendiente":
      return "Diagnostico pendiente";
    case "en_reparacion":
      return "En reparacion";
    case "listo_para_entrega":
      return "Listo para entrega";
    case "completada":
      return "Completada";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
}

async function ensureUniquePublicSlug(
  requestedSlug: string,
  currentWorkshopId?: string,
) {
  const supabase = await createSupabaseDataClient();
  const baseSlug = slugifyWorkshopPublicSlug(requestedSlug);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data, error } = await supabase
      .from("workshops")
      .select("id, public_slug")
      .eq("public_slug", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const match = (data as WorkshopSlugLookupRecord | null) ?? null;

    if (!match || match.id === currentWorkshopId) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function getCurrentWorkshopAccess(): Promise<CurrentWorkshopAccess | null> {
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

  const ownedWorkshop = (data as WorkshopRecord | null) ?? null;

  if (ownedWorkshop) {
    return {
      workshop: ownedWorkshop,
      role: "owner",
      member: null,
    };
  }

  const { data: memberData, error: memberError } = await supabase
    .from("workshop_members")
    .select("*, workshops(*)")
    .eq("email", session.user.email)
    .eq("is_active", true)
    .maybeSingle();

  if (memberError) {
    if (isMissingRelationError(memberError)) {
      return null;
    }

    throw memberError;
  }

  const membership = (memberData as (WorkshopMemberRecord & { workshops: WorkshopRecord | WorkshopRecord[] | null }) | null) ?? null;

  if (!membership) {
    return null;
  }

  const workshop = Array.isArray(membership.workshops) ? membership.workshops[0] ?? null : membership.workshops;

  if (!workshop) {
    return null;
  }

  return {
    workshop,
    role: membership.role,
    member: {
      id: membership.id,
      workshop_id: membership.workshop_id,
      email: membership.email,
      full_name: membership.full_name,
      role: membership.role,
      is_active: membership.is_active,
      created_at: membership.created_at,
      updated_at: membership.updated_at,
    },
  };
}

export async function getCurrentWorkshop() {
  const access = await getCurrentWorkshopAccess();
  return access?.workshop ?? null;
}

export async function getCurrentWorkshopRole() {
  const access = await getCurrentWorkshopAccess();
  return access?.role ?? null;
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

  const supabase = await createSupabaseDataClient();
  const { data: existingWorkshop, error: existingWorkshopError } = await supabase
    .from("workshops")
    .select("id, public_slug")
    .eq("owner_email", session.user.email)
    .maybeSingle();

  if (existingWorkshopError && !isMissingRelationError(existingWorkshopError)) {
    throw existingWorkshopError;
  }

  const currentWorkshop = (existingWorkshop as WorkshopSlugLookupRecord | null) ?? null;
  const publicSlug = await ensureUniquePublicSlug(
    input.publicSlug || currentWorkshop?.public_slug || input.workshopName,
    currentWorkshop?.id,
  );

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
    gallery_image_urls: input.galleryImageUrls,
    preferred_currency: input.currencyDisplay,
    public_description: input.publicDescription || null,
    public_address: input.publicAddress || null,
    public_contact_phone: input.publicContactPhone || null,
    public_contact_email: input.publicContactEmail || null,
    public_slug: publicSlug,
    public_services: input.publicServices,
    profile_visibility: input.profileVisibility,
  };

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

export async function getPublicWorkshopBySlug(slug: string) {
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("workshops")
    .select("*")
    .eq("public_slug", slugifyWorkshopPublicSlug(slug))
    .eq("profile_visibility", "public")
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }

    throw error;
  }

  return (data as WorkshopRecord | null) ?? null;
}

export async function getDashboardStats(workshopId: string): Promise<DashboardStats> {
  const supabase = await createSupabaseDataClient();
  const monthSeries = getMonthSeries(6);

  const [
    workOrdersResult,
    quotesResult,
    recentOrdersResult,
    paymentsResult,
    expensesResult,
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id,status,created_at,total_amount")
      .eq("workshop_id", workshopId),
    supabase
      .from("quotes")
      .select("id,status,created_at,total_amount")
      .eq("workshop_id", workshopId),
    supabase
      .from("work_orders")
      .select("id,title,status,vehicle_label,promised_date,total_amount")
      .eq("workshop_id", workshopId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("amount,status,paid_at")
      .eq("workshop_id", workshopId),
    supabase
      .from("expenses")
      .select("amount,spent_at")
      .eq("workshop_id", workshopId),
  ]);

  const results = [
    workOrdersResult.error,
    quotesResult.error,
    recentOrdersResult.error,
    paymentsResult.error,
    expensesResult.error,
  ];

  const nonMissingError = results.find((error) => error && !isMissingRelationError(error));

  if (nonMissingError) {
    throw nonMissingError;
  }

  const workOrders = (workOrdersResult.data as WorkOrderAnalyticsRow[] | null) ?? [];
  const quotes = (quotesResult.data as QuoteAnalyticsRow[] | null) ?? [];
  const payments = (paymentsResult.data as PaymentRow[] | null) ?? [];
  const expenses = (expensesResult.data as ExpenseRow[] | null) ?? [];

  const activeWorkOrders = workOrders.filter((workOrder) =>
    ["presupuesto_pendiente", "diagnostico_pendiente", "en_reparacion", "listo_para_entrega"].includes(
      workOrder.status,
    ),
  ).length;

  const pendingQuotes = quotes.filter((quote) => ["draft", "sent"].includes(quote.status)).length;
  const pendingServices = workOrders.filter((workOrder) =>
    ["presupuesto_pendiente", "diagnostico_pendiente", "en_reparacion"].includes(workOrder.status),
  ).length;

  const collectedPayments = payments.filter((payment) =>
    ["paid", "partial"].includes(payment.status ?? ""),
  );

  const currentMonthKey = getMonthKey(new Date().toISOString());
  const collectedThisPeriod = collectedPayments
    .filter((payment) => getMonthKey(payment.paid_at) === currentMonthKey)
    .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  const completedOrders = workOrders.filter((workOrder) => workOrder.status === "completada").length;
  const averageTicket = completedOrders
    ? workOrders
        .filter((workOrder) => workOrder.status === "completada")
        .reduce((total, workOrder) => total + Number(workOrder.total_amount ?? 0), 0) / completedOrders
    : 0;

  const workOrdersByStatus = [
    "presupuesto_pendiente",
    "diagnostico_pendiente",
    "en_reparacion",
    "listo_para_entrega",
    "completada",
    "cancelada",
  ].map((status) => ({
    label: formatDashboardStatus(status),
    value: workOrders.filter((workOrder) => workOrder.status === status).length,
    color: getWorkOrderStatusColor(status),
  }));

  const quotesByStatus = ["draft", "sent", "approved", "rejected", "expired"].map((status) => ({
    label:
      status === "draft"
        ? "Borrador"
        : status === "sent"
          ? "Enviado"
          : status === "approved"
            ? "Aprobado"
            : status === "rejected"
              ? "Rechazado"
              : "Vencido",
    value: quotes.filter((quote) => quote.status === status).length,
    color: getQuoteStatusColor(status),
  }));

  const cashflowTrend = monthSeries.map((month) => ({
    label: month.label,
    collected: Number(
      collectedPayments
        .filter((payment) => getMonthKey(payment.paid_at) === month.key)
        .reduce((total, payment) => total + Number(payment.amount ?? 0), 0)
        .toFixed(2),
    ),
    expenses: Number(
      expenses
        .filter((expense) => getMonthKey(expense.spent_at) === month.key)
        .reduce((total, expense) => total + Number(expense.amount ?? 0), 0)
        .toFixed(2),
    ),
  }));

  return {
    activeWorkOrders,
    pendingQuotes,
    pendingServices,
    collectedThisPeriod,
    completedOrders,
    averageTicket: Number(averageTicket.toFixed(2)),
    recentOrders:
      ((recentOrdersResult.data as RecentOrderRow[] | null)?.map((order) => ({
        id: order.id,
        title: order.title,
        status: formatDashboardStatus(order.status),
        vehicleLabel: order.vehicle_label,
        promisedDate: order.promised_date,
        totalAmount: Number(order.total_amount ?? 0),
      })) ?? []),
    analytics: {
      workOrdersByStatus,
      quotesByStatus,
      cashflowTrend,
    },
  };
}
