import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { QuoteItemRecord, QuoteRecord } from "@/lib/data/quotes";
import type {
  WorkOrderPartRecord,
  WorkOrderRecord,
  WorkOrderServiceRecord,
  WorkOrderStatusHistoryRecord,
} from "@/lib/data/work-orders";
import { isCollectedPaymentStatus } from "@/lib/finances/constants";
import { buildClientQuoteProjection, type ClientQuoteProjection } from "@/lib/documents/repair-documents";

type PublicWorkshop = {
  id: string;
  workshop_name: string;
  owner_name: string;
  whatsapp_phone: string;
  city: string;
  opening_hours_label: string | null;
  logo_url: string | null;
  preferred_currency: "USD" | "VES" | "USD_VES";
  public_address: string | null;
  public_contact_phone: string | null;
  public_contact_email: string | null;
  tax_id: string | null;
  document_terms: string | null;
  warranty_terms: string | null;
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
    .select("id,workshop_name,owner_name,whatsapp_phone,city,opening_hours_label,logo_url,preferred_currency,public_address,public_contact_phone,public_contact_email,tax_id,document_terms,warranty_terms")
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
  laborItems: PublicQuoteItem[];
  partItems: PublicQuoteItem[];
  canApprove: boolean;
};

type PublicQuoteItem = Omit<QuoteItemRecord, "unit_cost" | "cost_source" | "cost_captured_at">;

export async function getPublicQuoteDetailByToken(token: string): Promise<PublicQuoteDetail | null> {
  const supabase = requireAdminClient();
  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select("id,workshop_id,client_id,vehicle_id,title,status,subtotal,total_amount,notes,sent_at,approved_at,document_number,version,issued_at,valid_until,discount_amount,tax_status,tax_label,tax_rate,tax_amount,public_share_token,public_share_enabled,public_shared_at,archived_at,deleted_at,created_at,updated_at")
    .eq("public_share_token", token)
    .eq("public_share_enabled", true)
    .in("status", ["sent", "approved", "rejected", "expired"])
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
      .select("id,quote_id,workshop_id,inventory_item_id,item_type,description,work_group,quantity,unit_label,unit_price,line_total,sort_order,created_at")
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

  const items: PublicQuoteItem[] = ((itemsData as PublicQuoteItem[] | null) ?? []).map((item) => ({
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
    canApprove: quote.status === "sent",
  };
}

export async function getPublicClientQuoteDocumentByToken(token: string): Promise<ClientQuoteProjection | null> {
  const detail = await getPublicQuoteDetailByToken(token);
  if (!detail) return null;

  return buildClientQuoteProjection({
    workshop: {
      name: detail.workshop.workshop_name,
      address: detail.workshop.public_address,
      city: detail.workshop.city,
      phone: detail.workshop.public_contact_phone || detail.workshop.whatsapp_phone,
      email: detail.workshop.public_contact_email,
      taxId: detail.workshop.tax_id,
      logoUrl: detail.workshop.logo_url,
      warrantyTerms: detail.workshop.warranty_terms,
      documentTerms: detail.workshop.document_terms,
    },
    quote: {
      id: detail.quote.id,
      number: detail.quote.document_number || `PRE-${detail.quote.id.slice(0, 8).toUpperCase()}`,
      version: detail.quote.version ?? 1,
      status: detail.quote.status,
      createdAt: detail.quote.created_at,
      issuedAt: detail.quote.issued_at,
      approvedAt: detail.quote.approved_at,
      validUntil: detail.quote.valid_until,
      notes: detail.quote.notes,
      currency: detail.workshop.preferred_currency,
      discountAmount: Number(detail.quote.discount_amount ?? 0),
      taxStatus: detail.quote.tax_status ?? "pending",
      taxLabel: detail.quote.tax_label,
      taxRate: detail.quote.tax_rate == null ? null : Number(detail.quote.tax_rate),
    },
    client: detail.client ? { name: detail.client.full_name } : null,
    vehicle: detail.vehicle
      ? {
          label: detail.vehicle.vehicle_label || [detail.vehicle.make, detail.vehicle.model, detail.vehicle.vehicle_year].filter(Boolean).join(" "),
          plate: detail.vehicle.plate,
          mileage: detail.vehicle.mileage,
        }
      : null,
    lines: [...detail.laborItems, ...detail.partItems].map((item) => ({
      id: item.id,
      itemType: item.item_type,
      description: item.description,
      workGroup: item.work_group,
      quantity: item.quantity,
      unit: item.unit_label,
      unitSalePrice: item.unit_price,
    })),
  });
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

  await supabase
    .from("quote_revisions")
    .update({ accepted_at: now, status: "approved" })
    .eq("quote_id", detail.quote.id)
    .eq("version", detail.quote.version ?? 1);

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
    .select("id,workshop_id,client_id,vehicle_id,quote_id,code,title,vehicle_label,status,promised_date,completed_at,total_amount,bay_slot,assigned_mechanic_id,assigned_mechanic_name,public_share_token,public_share_enabled,public_shared_at,notes,created_at,updated_at")
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
      .select("id,work_order_id,workshop_id,description,quantity,unit_price,line_total,sort_order,created_at")
      .eq("work_order_id", workOrder.id)
      .eq("workshop_id", workOrder.workshop_id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("work_order_parts")
      .select("id,work_order_id,workshop_id,inventory_item_id,description,quantity,unit_price,line_total,sort_order,created_at")
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
