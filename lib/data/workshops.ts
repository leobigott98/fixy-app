import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAppSession } from "@/lib/auth/session";
import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
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
