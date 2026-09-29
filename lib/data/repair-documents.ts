import { notFound } from "next/navigation";

import { createSupabaseSessionClient, isMissingRelationError } from "@/lib/data/core";
import { getCurrentWorkshopAccess, requireWorkshopOperation } from "@/lib/data/workshops";
import {
  buildClientQuoteProjection,
  buildInternalCostProjection,
  buildMechanicWorkOrderProjection,
  type ClientQuoteProjection,
  type InternalCostProjection,
  type MechanicWorkOrderProjection,
  type MechanicDocumentLineSource,
  type RepairDocumentLineSource,
  type RepairDocumentSource,
} from "@/lib/documents/repair-documents";
import { getWorkshopOperationDecision } from "@/lib/permissions";

type QuoteDocumentRow = {
  id: string;
  workshop_id: string;
  client_id: string | null;
  vehicle_id: string | null;
  status: RepairDocumentSource["quote"]["status"];
  document_number: string | null;
  version: number | string | null;
  created_at: string;
  issued_at: string | null;
  approved_at: string | null;
  valid_until: string | null;
  notes: string | null;
  discount_amount: number | string | null;
  tax_status: RepairDocumentSource["quote"]["taxStatus"];
  tax_label: string | null;
  tax_rate: number | string | null;
};

type QuoteDocumentItemRow = {
  id: string;
  item_type: "labor" | "part";
  description: string;
  work_group: string | null;
  quantity: number | string | null;
  unit_label: string | null;
  unit_price: number | string | null;
  unit_cost?: number | string | null;
  cost_source?: string | null;
};

function documentNumber(quote: Pick<QuoteDocumentRow, "id" | "document_number">) {
  return quote.document_number || `PRE-${quote.id.slice(0, 8).toUpperCase()}`;
}

function workshopIdentity(workshop: Awaited<ReturnType<typeof requireWorkshopOperation>>["workshop"]) {
  return {
    name: workshop.workshop_name,
    address: workshop.public_address,
    city: workshop.city,
    phone: workshop.public_contact_phone || workshop.whatsapp_phone,
    email: workshop.public_contact_email,
    taxId: workshop.tax_id,
    logoUrl: workshop.logo_url,
    warrantyTerms: workshop.warranty_terms,
    documentTerms: workshop.document_terms,
  };
}

function mapLine(row: QuoteDocumentItemRow): RepairDocumentLineSource {
  return {
    id: row.id,
    itemType: row.item_type,
    description: row.description,
    workGroup: row.work_group,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit_label,
    unitSalePrice: Number(row.unit_price ?? 0),
    unitCost: row.unit_cost == null ? null : Number(row.unit_cost),
    costSource: row.cost_source ?? null,
  };
}

async function getQuoteSource(quoteId: string, includeInternalCosts: boolean) {
  const operation = includeInternalCosts ? "documents.internal" : "documents.client";
  const { workshop } = await requireWorkshopOperation(operation);
  const supabase = await createSupabaseSessionClient();
  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select("id,workshop_id,client_id,vehicle_id,status,document_number,version,created_at,issued_at,approved_at,valid_until,notes,discount_amount,tax_status,tax_label,tax_rate")
    .eq("workshop_id", workshop.id)
    .eq("id", quoteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (quoteError) {
    if (isMissingRelationError(quoteError)) notFound();
    throw quoteError;
  }

  const quote = quoteData as QuoteDocumentRow | null;
  if (!quote) notFound();

  const [itemsResult, costsResult, clientResult, vehicleResult, workOrderResult] = await Promise.all([
    supabase
      .from("quote_items")
      .select("id,item_type,description,work_group,quantity,unit_label,unit_price")
      .eq("workshop_id", workshop.id)
      .eq("quote_id", quote.id)
      .order("sort_order", { ascending: true }),
    includeInternalCosts
      ? supabase
          .from("internal_quote_item_costs")
          .select("id,unit_cost,cost_source")
          .eq("workshop_id", workshop.id)
          .eq("quote_id", quote.id)
      : Promise.resolve({ data: [], error: null }),
    quote.client_id
      ? supabase.from("clients").select("full_name").eq("workshop_id", workshop.id).eq("id", quote.client_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    quote.vehicle_id
      ? supabase
          .from("vehicles")
          .select("vehicle_label,plate,make,model,vehicle_year,mileage")
          .eq("workshop_id", workshop.id)
          .eq("id", quote.vehicle_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    includeInternalCosts
      ? supabase
          .from("operation_work_order_financials")
          .select("id,code,status")
          .eq("workshop_id", workshop.id)
          .eq("quote_id", quote.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const firstError = [itemsResult.error, costsResult.error, clientResult.error, vehicleResult.error, workOrderResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );
  if (firstError) throw firstError;

  const vehicle = vehicleResult.data as {
    vehicle_label: string | null;
    plate: string | null;
    make: string | null;
    model: string | null;
    vehicle_year: number | null;
    mileage: number | null;
  } | null;
  const linkedWorkOrder = workOrderResult.data as { id: string; code: string | null; status: string } | null;

  const costsByItemId = new Map(
    (((costsResult.data as Array<{ id: string; unit_cost: number | string | null; cost_source: string | null }> | null) ?? [])
      .map((row) => [row.id, row] as const)),
  );
  const source: RepairDocumentSource = {
    workshop: workshopIdentity(workshop),
    quote: {
      id: quote.id,
      number: documentNumber(quote),
      version: Number(quote.version ?? 1),
      status: quote.status,
      createdAt: quote.created_at,
      issuedAt: quote.issued_at,
      approvedAt: quote.approved_at,
      validUntil: quote.valid_until,
      notes: quote.notes,
      currency: workshop.preferred_currency,
      discountAmount: Number(quote.discount_amount ?? 0),
      taxStatus: quote.tax_status ?? "pending",
      taxLabel: quote.tax_label,
      taxRate: quote.tax_rate == null ? null : Number(quote.tax_rate),
    },
    client: clientResult.data
      ? { name: (clientResult.data as { full_name: string }).full_name }
      : null,
    vehicle: vehicle
      ? {
          label:
            vehicle.vehicle_label ||
            [vehicle.make, vehicle.model, vehicle.vehicle_year].filter(Boolean).join(" ") ||
            "Vehículo pendiente",
          plate: vehicle.plate,
          mileage: vehicle.mileage,
        }
      : null,
    workOrder: linkedWorkOrder
      ? {
          id: linkedWorkOrder.id,
          number: linkedWorkOrder.code || `OT-${linkedWorkOrder.id.slice(0, 8).toUpperCase()}`,
          status: linkedWorkOrder.status,
        }
      : null,
    lines: ((itemsResult.data as unknown as QuoteDocumentItemRow[] | null) ?? []).map((row) => {
      const cost = costsByItemId.get(row.id);
      return mapLine({ ...row, unit_cost: cost?.unit_cost ?? null, cost_source: cost?.cost_source ?? null });
    }),
  };

  if (includeInternalCosts && linkedWorkOrder) {
    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("id,category,amount,spent_at,notes")
      .eq("workshop_id", workshop.id)
      .eq("work_order_id", linkedWorkOrder.id)
      .order("spent_at", { ascending: true });

    if (expensesError && !isMissingRelationError(expensesError)) throw expensesError;

    source.attributableExpenses = ((expensesData as Array<{
      id: string;
      category: string;
      amount: number | string | null;
      spent_at: string | null;
      notes: string | null;
    }> | null) ?? []).map((expense) => ({
      id: expense.id,
      description: expense.notes || expense.category,
      amount: Number(expense.amount ?? 0),
      incurredAt: expense.spent_at,
    }));
  }

  return source;
}

export async function getClientQuoteDocument(quoteId: string): Promise<ClientQuoteProjection> {
  return buildClientQuoteProjection(await getQuoteSource(quoteId, false));
}

export async function getInternalCostDocument(quoteId: string): Promise<InternalCostProjection> {
  return buildInternalCostProjection(await getQuoteSource(quoteId, true));
}

export async function getLinkedWorkOrderDocumentLink(quoteId: string) {
  const access = await getCurrentWorkshopAccess();
  if (!access) return null;

  const subject = {
    role: access.role,
    isActive: access.member?.is_active ?? access.role === "owner",
    mechanicId: access.member?.mechanic_id ?? null,
  };
  if (!getWorkshopOperationDecision(subject, "documents.client").allowed) return null;

  const supabase = await createSupabaseSessionClient();
  const { data, error } = await supabase
    .from(access.role === "finanzas" ? "operation_work_order_financials" : "work_orders")
    .select("id,code")
    .eq("workshop_id", access.workshop.id)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (error && !isMissingRelationError(error)) throw error;
  return (data as { id: string; code: string | null } | null) ?? null;
}

export async function getMechanicWorkOrderDocument(workOrderId: string): Promise<MechanicWorkOrderProjection> {
  const currentAccess = await getCurrentWorkshopAccess();
  if (!currentAccess) notFound();
  const supabase = await createSupabaseSessionClient();
  const { data: workOrderData, error: workOrderError } = await supabase
    .from(currentAccess.role === "mechanic" ? "operation_mechanic_work_orders" : "work_orders")
    .select("id,workshop_id,quote_id,code,status,vehicle_label,plate_snapshot,mileage_snapshot,assigned_mechanic_id,assigned_mechanic_name,notes,quote_version,quote_document_number")
    .eq("id", workOrderId)
    .maybeSingle();

  if (workOrderError) {
    if (isMissingRelationError(workOrderError)) notFound();
    throw workOrderError;
  }

  const workOrder = workOrderData as {
    id: string;
    workshop_id: string;
    quote_id: string | null;
    code: string | null;
    status: string;
    vehicle_label: string | null;
    plate_snapshot: string | null;
    mileage_snapshot: number | null;
    assigned_mechanic_id: string | null;
    assigned_mechanic_name: string | null;
    notes: string | null;
    quote_version: number | null;
    quote_document_number: string | null;
  } | null;
  if (!workOrder) notFound();

  const { workshop } = await requireWorkshopOperation("documents.mechanic", {
    assignedMechanicId: workOrder.assigned_mechanic_id,
  });
  if (workshop.id !== workOrder.workshop_id) notFound();

  const [servicesResult, partsResult] = await Promise.all([
    supabase
      .from("work_order_services")
      .select("id,description,quantity,work_group,unit_label,sort_order")
      .eq("workshop_id", workshop.id)
      .eq("work_order_id", workOrder.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("work_order_parts")
      .select("id,description,quantity,work_group,unit_label,sort_order")
      .eq("workshop_id", workshop.id)
      .eq("work_order_id", workOrder.id)
      .order("sort_order", { ascending: true }),
  ]);

  const rowsError = [servicesResult.error, partsResult.error].find(Boolean);
  if (rowsError) throw rowsError;

  const toSafeLine = (
    row: { id: string; description: string; quantity: number | string | null; work_group: string | null; unit_label: string | null },
    itemType: "labor" | "part",
  ): MechanicDocumentLineSource => ({
    id: row.id,
    itemType,
    description: row.description,
    workGroup: row.work_group,
    quantity: Number(row.quantity ?? 0),
    unit: row.unit_label,
  });

  const services = (servicesResult.data as Array<{
    id: string; description: string; quantity: number | string | null; work_group: string | null; unit_label: string | null;
  }> | null) ?? [];
  const parts = (partsResult.data as typeof services) ?? [];

  return buildMechanicWorkOrderProjection({
    quote: {
      number: workOrder.quote_document_number || (workOrder.quote_id ? `PRE-${workOrder.quote_id.slice(0, 8).toUpperCase()}` : "Sin presupuesto"),
      version: workOrder.quote_version ?? 1,
      status: workOrder.status === "presupuesto_pendiente" ? "draft" : "approved",
      notes: null,
    },
    vehicle: {
      label: workOrder.vehicle_label || "Vehículo pendiente",
      plate: workOrder.plate_snapshot,
      mileage: workOrder.mileage_snapshot,
    },
    workOrder: {
      id: workOrder.id,
      number: workOrder.code || `OT-${workOrder.id.slice(0, 8).toUpperCase()}`,
      status: workOrder.status,
      responsible: workOrder.assigned_mechanic_name,
      notes: workOrder.notes,
    },
    lines: [
      ...services.map((row) => toSafeLine(row, "labor")),
      ...parts.map((row) => toSafeLine(row, "part")),
    ],
  });
}
