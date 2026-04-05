import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QuoteItemRecord, QuoteRecord } from "@/lib/data/quotes";
import type {
  WorkOrderPartRecord,
  WorkOrderRecord,
  WorkOrderServiceRecord,
  WorkOrderStatusHistoryRecord,
} from "@/lib/data/work-orders";
import { isCollectedPaymentStatus } from "@/lib/finances/constants";

type PublicWorkshop = {
  id: string;
  workshop_name: string;
  owner_name: string;
  whatsapp_phone: string;
  city: string;
  opening_hours_label: string | null;
  logo_url: string | null;
  preferred_currency: "USD" | "VES" | "USD_VES";
};

type PublicClient = {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
};

type PublicVehicle = {
  id: string;
  vehicle_label: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  vehicle_year: number | null;
  color: string | null;
  mileage: number | null;
};

type PublicPaymentRow = {
  amount: number | string | null;
  status: string | null;
};

function requireAdminClient() {
  return createSupabaseAdminClient();
}

async function getWorkshopById(workshopId: string) {
  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("workshops")
    .select("id,workshop_name,owner_name,whatsapp_phone,city,opening_hours_label,logo_url,preferred_currency")
    .eq("id", workshopId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PublicWorkshop | null) ?? null;
}

async function getClientById(clientId?: string | null) {
  if (!clientId) {
    return null;
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id,full_name,whatsapp_phone")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PublicClient | null) ?? null;
}

async function getVehicleById(vehicleId?: string | null) {
  if (!vehicleId) {
    return null;
  }

  const supabase = requireAdminClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("id,vehicle_label,plate,make,model,vehicle_year,color,mileage")
    .eq("id", vehicleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PublicVehicle | null) ?? null;
}

export type PublicQuoteDetail = {
  workshop: PublicWorkshop;
  client: PublicClient | null;
  vehicle: PublicVehicle | null;
  quote: QuoteRecord;
  laborItems: QuoteItemRecord[];
  partItems: QuoteItemRecord[];
  canApprove: boolean;
};

export async function getPublicQuoteDetailByToken(token: string): Promise<PublicQuoteDetail | null> {
  const supabase = requireAdminClient();
  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("public_share_token", token)
    .eq("public_share_enabled", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (quoteError) {
    throw quoteError;
  }

  const quote = (quoteData as QuoteRecord | null) ?? null;

  if (!quote || quote.archived_at) {
    return null;
  }

  const [{ data: itemsData, error: itemsError }, workshop, client, vehicle] = await Promise.all([
    supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quote.id)
      .eq("workshop_id", quote.workshop_id)
      .order("sort_order", { ascending: true }),
    getWorkshopById(quote.workshop_id),
    getClientById(quote.client_id),
    getVehicleById(quote.vehicle_id),
  ]);

  if (itemsError) {
    throw itemsError;
  }

  if (!workshop) {
    return null;
  }

  const items = ((itemsData as QuoteItemRecord[] | null) ?? []).map((item) => ({
    ...item,
    quantity: Number(item.quantity ?? 0),
    unit_price: Number(item.unit_price ?? 0),
    line_total: Number(item.line_total ?? 0),
  }));

  return {
    workshop,
    client,
    vehicle,
    quote: {
      ...quote,
      subtotal: Number(quote.subtotal ?? 0),
      total_amount: Number(quote.total_amount ?? 0),
    },
    laborItems: items.filter((item) => item.item_type === "labor"),
    partItems: items.filter((item) => item.item_type === "part"),
    canApprove: quote.status === "draft" || quote.status === "sent",
  };
}

export async function approvePublicQuoteByToken(token: string) {
  const detail = await getPublicQuoteDetailByToken(token);

  if (!detail) {
    throw new Error("Presupuesto no encontrado.");
  }

  if (!detail.canApprove) {
    throw new Error("Este presupuesto ya no admite aprobacion.");
  }

  const supabase = requireAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("quotes")
    .update({
      status: "approved",
      approved_at: now,
      sent_at: detail.quote.sent_at ?? now,
    })
    .eq("id", detail.quote.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as QuoteRecord;
}

export type PublicWorkOrderDetail = {
  workshop: PublicWorkshop;
  client: PublicClient | null;
  vehicle: PublicVehicle | null;
  workOrder: WorkOrderRecord;
  services: WorkOrderServiceRecord[];
  parts: WorkOrderPartRecord[];
  statusHistory: WorkOrderStatusHistoryRecord[];
  paymentSummary: {
    totalCollected: number;
    paymentCount: number;
    pendingBalance: number;
  };
};

export async function getPublicWorkOrderDetailByToken(
  token: string,
): Promise<PublicWorkOrderDetail | null> {
  const supabase = requireAdminClient();
  const { data: workOrderData, error: workOrderError } = await supabase
    .from("work_orders")
    .select("*")
    .eq("public_share_token", token)
    .eq("public_share_enabled", true)
    .maybeSingle();

  if (workOrderError) {
    throw workOrderError;
  }

  const workOrder = (workOrderData as WorkOrderRecord | null) ?? null;

  if (!workOrder) {
    return null;
  }

  const [
    { data: servicesData, error: servicesError },
    { data: partsData, error: partsError },
    { data: historyData, error: historyError },
    { data: paymentsData, error: paymentsError },
    workshop,
    client,
    vehicle,
  ] = await Promise.all([
    supabase
      .from("work_order_services")
      .select("*")
      .eq("work_order_id", workOrder.id)
      .eq("workshop_id", workOrder.workshop_id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("work_order_parts")
      .select("*")
      .eq("work_order_id", workOrder.id)
      .eq("workshop_id", workOrder.workshop_id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("work_order_status_history")
      .select("*")
      .eq("work_order_id", workOrder.id)
      .eq("workshop_id", workOrder.workshop_id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("payments")
      .select("amount,status")
      .eq("work_order_id", workOrder.id)
      .eq("workshop_id", workOrder.workshop_id),
    getWorkshopById(workOrder.workshop_id),
    getClientById(workOrder.client_id),
    getVehicleById(workOrder.vehicle_id),
  ]);

  if (servicesError || partsError || historyError || paymentsError) {
    throw servicesError || partsError || historyError || paymentsError;
  }

  if (!workshop) {
    return null;
  }

  const payments = (paymentsData as PublicPaymentRow[] | null) ?? [];
  const totalCollected = payments
    .filter((payment) => isCollectedPaymentStatus(payment.status))
    .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  return {
    workshop,
    client,
    vehicle,
    workOrder: {
      ...workOrder,
      total_amount: Number(workOrder.total_amount ?? 0),
    },
    services: ((servicesData as WorkOrderServiceRecord[] | null) ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      line_total: Number(item.line_total ?? 0),
    })),
    parts: ((partsData as WorkOrderPartRecord[] | null) ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      line_total: Number(item.line_total ?? 0),
    })),
    statusHistory: (historyData as WorkOrderStatusHistoryRecord[] | null) ?? [],
    paymentSummary: {
      totalCollected,
      paymentCount: payments.length,
      pendingBalance: Math.max(Number((Number(workOrder.total_amount ?? 0) - totalCollected).toFixed(2)), 0),
    },
  };
}
