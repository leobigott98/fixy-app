import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import {
  createSupabaseSessionClient,
  isMissingRelationError,
} from "@/lib/data/core";
import { requireWorkshopOperation } from "@/lib/data/workshops";
import { canViewInternalDocument } from "@/lib/permissions";
import { buildPublicQuoteDocumentPath, buildPublicQuotePath } from "@/lib/share-links";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeQuoteInput,
  type QuoteFormValues,
  type QuoteInput,
  type QuoteItemFormValues,
  type QuoteItemInput,
} from "@/lib/quotes/schema";

export type QuoteRecord = {
  id: string;
  workshop_id: string;
  client_id: string | null;
  vehicle_id: string | null;
  title: string;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  subtotal: number;
  total_amount: number;
  notes: string | null;
  sent_at: string | null;
  approved_at: string | null;
  document_number: string | null;
  version: number;
  issued_at: string | null;
  valid_until: string | null;
  discount_amount: number;
  tax_status: "pending" | "applied" | "not_applicable";
  tax_label: string | null;
  tax_rate: number | null;
  tax_amount: number | null;
  public_share_token: string | null;
  public_share_enabled: boolean;
  public_shared_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItemRecord = {
  id: string;
  quote_id: string;
  workshop_id: string;
  inventory_item_id: string | null;
  item_type: "labor" | "part";
  description: string;
  work_group: string;
  unit_label: string;
  unit_cost: number | null;
  cost_source: string | null;
  cost_captured_at: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

type ClientLite = {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
};

type VehicleLite = {
  id: string;
  client_id: string | null;
  vehicle_label: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  vehicle_year: number | null;
};

export type QuoteListItem = QuoteRecord & {
  client: ClientLite | null;
  vehicle: VehicleLite | null;
  itemCount: number;
};

export type QuoteDetailData = {
  quote: QuoteRecord;
  client: ClientLite | null;
  vehicle: VehicleLite | null;
  laborItems: QuoteItemRecord[];
  partItems: QuoteItemRecord[];
};

export type QuoteFormOptions = {
  clients: Array<{
    id: string;
    fullName: string;
    whatsappPhone: string | null;
  }>;
  vehicles: Array<{
    id: string;
    clientId: string | null;
    label: string;
  }>;
  inventoryItems: Array<{
    id: string;
    label: string;
    name: string;
    stockQuantity: number;
    referenceSalePrice: number;
    cost: number | null;
  }>;
};

type WorkshopClientLite = ClientLite & { workshop_id: string };
type WorkshopVehicleLite = VehicleLite & { workshop_id: string };

type QuoteRowWithRelations = QuoteRecord & {
  clients: WorkshopClientLite | WorkshopClientLite[] | null;
  vehicles: WorkshopVehicleLite | WorkshopVehicleLite[] | null;
};

export type QuoteInputErrorCode =
  | "client_not_available"
  | "vehicle_not_available"
  | "inventory_items_not_available"
  | "quote_not_available";

export class QuoteInputError extends Error {
  readonly code: QuoteInputErrorCode;

  constructor(code: QuoteInputErrorCode) {
    const messages: Record<QuoteInputErrorCode, string> = {
      client_not_available: "El cliente seleccionado no esta disponible.",
      vehicle_not_available: "El vehiculo seleccionado no esta disponible para ese cliente.",
      inventory_items_not_available: "Uno o mas repuestos no estan disponibles.",
      quote_not_available: "El presupuesto seleccionado no esta disponible.",
    };

    super(messages[code]);
    this.name = "QuoteInputError";
    this.code = code;
  }
}

class QuoteDataError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "QuoteDataError";
  }
}

function buildQuoteTitle(vehicle: VehicleLite | null) {
  if (!vehicle) {
    return "Presupuesto";
  }

  return `Presupuesto ${vehicle.vehicle_label || [vehicle.make, vehicle.model, vehicle.plate].filter(Boolean).join(" ")}`;
}

function toSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toWorkshopRelation<T extends { workshop_id: string }>(
  value: T | T[] | null,
  workshopId: string,
): Omit<T, "workshop_id"> | null {
  const relation = toSingleRelation(value);

  if (relation?.workshop_id !== workshopId) {
    return null;
  }

  const { workshop_id: _workshopId, ...scopedRelation } = relation;
  return scopedRelation;
}

function buildQuoteInventoryOptionLabel(item: {
  name: string;
  sku: string | null;
  stockQuantity: number;
}) {
  return [item.name, item.sku ? `SKU ${item.sku}` : null, `Stock ${item.stockQuantity}`]
    .filter(Boolean)
    .join(" · ");
}

function normalizeQuoteRecord(record: QuoteRecord) {
  return {
    ...record,
    subtotal: Number(record.subtotal ?? 0),
    total_amount: Number(record.total_amount ?? 0),
    version: Number(record.version ?? 1),
    discount_amount: Number(record.discount_amount ?? 0),
    tax_rate: record.tax_rate == null ? null : Number(record.tax_rate),
    tax_amount: record.tax_amount == null ? null : Number(record.tax_amount),
  };
}

export function getQuoteStatusLabel(status: QuoteRecord["status"]) {
  switch (status) {
    case "draft":
      return "Borrador";
    case "sent":
      return "Enviado";
    case "approved":
      return "Aprobado";
    case "rejected":
      return "Rechazado";
    case "expired":
      return "Vencido";
    default:
      return status;
  }
}

export function getQuoteStatusVariant(status: QuoteRecord["status"]) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "sent":
      return "primary" as const;
    default:
      return "default" as const;
  }
}

export async function getQuoteFormOptions(): Promise<QuoteFormOptions> {
  const { workshop, role } = await requireWorkshopOperation("quotes.view");
  const supabase = await createSupabaseSessionClient();

  const [clientsResult, vehiclesResult, inventoryItemsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,full_name,whatsapp_phone")
      .eq("workshop_id", workshop.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("vehicles")
      .select("id,client_id,vehicle_label,plate,make,model,vehicle_year")
      .eq("workshop_id", workshop.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("inventory_items")
      .select(canViewInternalDocument(role) ? "id,name,sku,stock_quantity,cost,reference_sale_price" : "id,name,sku,stock_quantity,reference_sale_price")
      .eq("workshop_id", workshop.id)
      .order("name", { ascending: true }),
  ]);

  const nonMissingError = [clientsResult.error, vehiclesResult.error, inventoryItemsResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw new QuoteDataError("No se pudieron cargar las opciones del presupuesto.", nonMissingError);
  }

  const inventoryItems = ((inventoryItemsResult.data as Array<{
    id: string;
    name: string;
    sku: string | null;
    stock_quantity: number | string | null;
    reference_sale_price: number | string | null;
    cost: number | string | null;
  }> | null) ?? []).map((item) => {
    const stockQuantity = Number(item.stock_quantity ?? 0);

    return {
      id: item.id,
      name: item.name,
      stockQuantity,
      referenceSalePrice: Number(item.reference_sale_price ?? 0),
      cost: item.cost == null ? null : Number(item.cost),
      label: buildQuoteInventoryOptionLabel({
        name: item.name,
        sku: item.sku,
        stockQuantity,
      }),
    };
  });

  return {
    clients: (((clientsResult.data as Array<{ id: string; full_name: string; whatsapp_phone: string | null }> | null) ?? []).map(
      (client) => ({
        id: client.id,
        fullName: client.full_name,
        whatsappPhone: client.whatsapp_phone,
      }),
    )),
    vehicles: (((vehiclesResult.data as VehicleLite[] | null) ?? []).map((vehicle) => ({
      id: vehicle.id,
      clientId: vehicle.client_id,
      label:
        vehicle.vehicle_label ??
        [vehicle.make, vehicle.model, vehicle.vehicle_year, vehicle.plate].filter(Boolean).join(" "),
    }))),
    inventoryItems,
  };
}

export async function getQuotesList(search?: string, view: "active" | "archived" = "active"): Promise<QuoteListItem[]> {
  const { workshop } = await requireWorkshopOperation("quotes.view");
  const supabase = await createSupabaseSessionClient();
  const query = search?.trim() ?? "";

  let quotesQuery = supabase
    .from("quotes")
    .select("*, clients(id,workshop_id,full_name,whatsapp_phone), vehicles(id,workshop_id,client_id,vehicle_label,plate,make,model,vehicle_year)")
    .eq("workshop_id", workshop.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  quotesQuery =
    view === "archived" ? quotesQuery.not("archived_at", "is", null) : quotesQuery.is("archived_at", null);

  const { data, error } = await quotesQuery;

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw new QuoteDataError("No se pudieron cargar los presupuestos.", error);
  }

  const rows = ((data as QuoteRowWithRelations[] | null) ?? []).filter((quote) => {
    if (!query) {
      return true;
    }

    const client = toWorkshopRelation(quote.clients, workshop.id);
    const vehicle = toWorkshopRelation(quote.vehicles, workshop.id);
    const haystack = [
      quote.title,
      quote.notes ?? "",
      getQuoteStatusLabel(quote.status),
      client?.full_name ?? "",
      vehicle?.vehicle_label ?? "",
      vehicle?.plate ?? "",
      [vehicle?.make, vehicle?.model, vehicle?.vehicle_year].filter(Boolean).join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query.toLowerCase());
  });

  if (!rows.length) {
    return [];
  }

  const quoteIds = rows.map((quote) => quote.id);
  const { data: itemsData, error: itemsError } = await supabase
    .from("quote_items")
    .select("quote_id")
    .eq("workshop_id", workshop.id)
    .in("quote_id", quoteIds);

  if (itemsError && !isMissingRelationError(itemsError)) {
    throw new QuoteDataError("No se pudo cargar el detalle de los presupuestos.", itemsError);
  }

  const itemCounts = (((itemsData as Array<{ quote_id: string }> | null) ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.quote_id] = (acc[item.quote_id] ?? 0) + 1;
      return acc;
    },
    {},
  ));

  return rows.map((quote) => ({
    ...normalizeQuoteRecord(quote),
    client: toWorkshopRelation(quote.clients, workshop.id),
    vehicle: toWorkshopRelation(quote.vehicles, workshop.id),
    itemCount: itemCounts[quote.id] ?? 0,
  }));
}

export async function getQuoteDetail(quoteId: string): Promise<QuoteDetailData> {
  const { workshop } = await requireWorkshopOperation("quotes.view");
  const supabase = await createSupabaseSessionClient();

  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select("*, clients(id,workshop_id,full_name,whatsapp_phone), vehicles(id,workshop_id,client_id,vehicle_label,plate,make,model,vehicle_year)")
    .eq("workshop_id", workshop.id)
    .eq("id", quoteId)
    .maybeSingle();

  if (quoteError) {
    if (isMissingRelationError(quoteError)) {
      notFound();
    }

    throw new QuoteDataError("No se pudo cargar el presupuesto.", quoteError);
  }

  const quote = quoteData as QuoteRowWithRelations | null;

  if (!quote || quote.deleted_at) {
    notFound();
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("quote_items")
    .select("id,quote_id,workshop_id,inventory_item_id,item_type,description,work_group,quantity,unit_label,unit_price,line_total,sort_order,created_at")
    .eq("workshop_id", workshop.id)
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    if (!isMissingRelationError(itemsError)) {
      throw new QuoteDataError("No se pudieron cargar los items del presupuesto.", itemsError);
    }
  }

  const items = ((itemsData as Array<Omit<QuoteItemRecord, "unit_cost" | "cost_source" | "cost_captured_at">> | null) ?? []).map((item) => ({
    ...item,
    quantity: Number(item.quantity ?? 0),
    unit_price: Number(item.unit_price ?? 0),
    line_total: Number(item.line_total ?? 0),
    unit_cost: null,
    cost_source: null,
    cost_captured_at: null,
  }));

  return {
    quote: normalizeQuoteRecord(quote),
    client: toWorkshopRelation(quote.clients, workshop.id),
    vehicle: toWorkshopRelation(quote.vehicles, workshop.id),
    laborItems: items.filter((item) => item.item_type === "labor"),
    partItems: items.filter((item) => item.item_type === "part"),
  };
}

export async function getQuoteForEdit(quoteId: string) {
  const detail = await getQuoteDetail(quoteId);

  const access = await requireWorkshopOperation("quotes.view");
  if (!canViewInternalDocument(access.role)) {
    return detail;
  }

  const supabase = await createSupabaseSessionClient();
  const { data, error } = await supabase
    .from("internal_quote_item_costs")
    .select("id,unit_cost,cost_source,cost_captured_at")
    .eq("workshop_id", access.workshop.id)
    .eq("quote_id", quoteId);

  if (error && !isMissingRelationError(error)) {
    throw new QuoteDataError("No se pudieron cargar los costos internos.", error);
  }

  const costByItemId = new Map(
    (((data as Array<Pick<QuoteItemRecord, "id" | "unit_cost" | "cost_source" | "cost_captured_at">> | null) ?? [])
      .map((item) => [item.id, item] as const)),
  );
  const withCosts = (items: QuoteItemRecord[]) => items.map((item) => ({ ...item, ...(costByItemId.get(item.id) ?? {}) }));

  return { ...detail, laborItems: withCosts(detail.laborItems), partItems: withCosts(detail.partItems) };
}

function formatQuoteItemsForInsert(quoteId: string, workshopId: string, items: QuoteItemInput[]) {
  return items.map((item) => ({
    quote_id: quoteId,
    workshop_id: workshopId,
    inventory_item_id: item.itemType === "part" ? item.inventoryItemId ?? null : null,
    item_type: item.itemType,
    description: item.description,
    work_group: item.workGroup || "Trabajo general",
    unit_label: item.unit || (item.itemType === "labor" ? "servicio" : "unidad"),
    unit_cost: item.unitCost ?? null,
    cost_source: item.costSource ?? null,
    cost_captured_at: item.unitCost == null ? null : item.costCapturedAt ?? new Date().toISOString(),
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
    sort_order: item.sortOrder,
  }));
}

async function validateQuoteRelations(input: QuoteInput, workshopId: string) {
  const supabase = await createSupabaseSessionClient();

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("workshop_id", workshopId)
    .eq("id", input.clientId)
    .maybeSingle();

  if (clientError) {
    throw new QuoteDataError("No se pudo validar el cliente.", clientError);
  }

  if (!clientData) {
    throw new QuoteInputError("client_not_available");
  }

  const { data: vehicleData, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id,workshop_id,client_id,vehicle_label,plate,make,model,vehicle_year")
    .eq("workshop_id", workshopId)
    .eq("id", input.vehicleId)
    .maybeSingle();

  if (vehicleError) {
    throw new QuoteDataError("No se pudo validar el vehiculo.", vehicleError);
  }

  const vehicle = toWorkshopRelation(
    (vehicleData as WorkshopVehicleLite | null) ?? null,
    workshopId,
  );

  if (!vehicle) {
    throw new QuoteInputError("vehicle_not_available");
  }

  if (vehicle.client_id !== input.clientId) {
    throw new QuoteInputError("vehicle_not_available");
  }

  const inventoryItemIds = [...new Set(
    input.partItems
      .map((item) => item.inventoryItemId)
      .filter((itemId): itemId is string => Boolean(itemId)),
  )];

  if (inventoryItemIds.length) {
    const { data: inventoryItems, error: inventoryItemsError } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("workshop_id", workshopId)
      .in("id", inventoryItemIds);

    if (inventoryItemsError) {
      throw new QuoteDataError("No se pudieron validar los repuestos.", inventoryItemsError);
    }

    const availableItemIds = new Set(
      ((inventoryItems as Array<{ id: string }> | null) ?? []).map((item) => item.id),
    );

    if (inventoryItemIds.some((itemId) => !availableItemIds.has(itemId))) {
      throw new QuoteInputError("inventory_items_not_available");
    }
  }

  return {
    supabase,
    vehicle,
  };
}

function buildQuoteTimestamps(status: QuoteRecord["status"], existing?: Pick<QuoteRecord, "sent_at" | "approved_at"> | null) {
  const now = new Date().toISOString();

  const sentAt =
    status === "sent" || status === "approved"
      ? existing?.sent_at ?? now
      : existing?.sent_at ?? null;

  const approvedAt = status === "approved" ? existing?.approved_at ?? now : existing?.approved_at ?? null;

  return {
    sentAt,
    approvedAt,
  };
}

function buildQuoteDocumentNumber() {
  return `PRE-${Date.now().toString().slice(-6)}`;
}

function clientFacingSignature(input: QuoteInput) {
  return JSON.stringify({
    clientId: input.clientId,
    vehicleId: input.vehicleId,
    notes: input.notes,
    validUntil: input.validUntil ?? null,
    discountAmount: input.discountAmount,
    taxStatus: input.taxStatus,
    taxLabel: input.taxLabel ?? null,
    taxRate: input.taxRate,
    lines: [...input.laborItems, ...input.partItems].map((item) => ({
      itemType: item.itemType,
      inventoryItemId: item.inventoryItemId ?? null,
      description: item.description,
      workGroup: item.workGroup || "Trabajo general",
      unit: item.unit || (item.itemType === "labor" ? "servicio" : "unidad"),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  });
}

function storedClientFacingSignature(quote: QuoteRecord, items: QuoteItemRecord[]) {
  return JSON.stringify({
    clientId: quote.client_id,
    vehicleId: quote.vehicle_id,
    notes: quote.notes ?? "",
    validUntil: quote.valid_until,
    discountAmount: Number(quote.discount_amount ?? 0),
    taxStatus: quote.tax_status ?? "pending",
    taxLabel: quote.tax_label,
    taxRate: quote.tax_rate == null ? null : Number(quote.tax_rate),
    lines: items.map((item) => ({
      itemType: item.item_type,
      inventoryItemId: item.inventory_item_id,
      description: item.description,
      workGroup: item.work_group || "Trabajo general",
      unit: item.unit_label || (item.item_type === "labor" ? "servicio" : "unidad"),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
    })),
  });
}

async function loadQuoteSnapshot(quoteId: string, workshopId: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: quoteData, error: quoteError }, { data: itemsData, error: itemsError }] = await Promise.all([
    admin.from("quotes").select("*").eq("id", quoteId).eq("workshop_id", workshopId).maybeSingle(),
    admin.from("quote_items").select("*").eq("quote_id", quoteId).eq("workshop_id", workshopId).order("sort_order"),
  ]);

  if (quoteError || itemsError) throw quoteError || itemsError;
  return {
    quote: quoteData as QuoteRecord | null,
    items: ((itemsData as QuoteItemRecord[] | null) ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      line_total: Number(item.line_total ?? 0),
      unit_cost: item.unit_cost == null ? null : Number(item.unit_cost),
    })),
  };
}

async function preserveIssuedRevision(quote: QuoteRecord, items: QuoteItemRecord[]) {
  if (!quote.issued_at && quote.status === "draft") return null;

  const admin = createSupabaseAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("quote_revisions")
    .select("id")
    .eq("quote_id", quote.id)
    .eq("version", quote.version ?? 1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await admin
    .from("quote_revisions")
    .insert({
      quote_id: quote.id,
      workshop_id: quote.workshop_id,
      version: quote.version ?? 1,
      status: quote.status === "approved" ? "approved" : "sent",
      snapshot: { quote, items },
      issued_at: quote.issued_at || quote.sent_at || quote.created_at,
      accepted_at: quote.approved_at,
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}

export async function upsertQuote(inputValues: QuoteFormValues, quoteId?: string) {
  const { workshop, role } = await requireWorkshopOperation("quotes.manage");
  const input = normalizeQuoteInput(inputValues);
  const { supabase, vehicle } = await validateQuoteRelations(input, workshop.id);

  let existingQuote: QuoteRecord | null = null;
  let existingItems: QuoteItemRecord[] = [];

  if (quoteId) {
    const { data: scopedQuote, error: scopedQuoteError } = await supabase
      .from("quotes")
      .select("id")
      .eq("workshop_id", workshop.id)
      .eq("id", quoteId)
      .maybeSingle();

    if (scopedQuoteError) {
      throw new QuoteDataError("No se pudo validar el presupuesto.", scopedQuoteError);
    }

    if (!scopedQuote) {
      throw new QuoteInputError("quote_not_available");
    }

    const snapshot = await loadQuoteSnapshot(quoteId, workshop.id);
    existingQuote = snapshot.quote;
    existingItems = snapshot.items;

    if (!existingQuote) {
      throw new QuoteInputError("quote_not_available");
    }
  }

  const wasIssued = Boolean(existingQuote?.issued_at || existingQuote?.sent_at || existingQuote?.approved_at);
  const clientChanged = Boolean(existingQuote && clientFacingSignature(input) !== storedClientFacingSignature(existingQuote, existingItems));

  if (existingQuote && wasIssued && clientChanged) {
    await preserveIssuedRevision(existingQuote, existingItems);
  }

  const canManageCosts = role === "owner" || role === "admin" || role === "finanzas";
  const existingCostByItemId = new Map(existingItems.map((item) => [item.id, item] as const));
  const protectInternalCosts = (item: QuoteItemInput): QuoteItemInput => {
    const existingItem = item.sourceRowId ? existingCostByItemId.get(item.sourceRowId) : undefined;

    if (!canManageCosts) {
      return {
        ...item,
        unitCost: existingItem?.unit_cost ?? null,
        costSource: existingItem?.cost_source ?? null,
        costCapturedAt: existingItem?.cost_captured_at ?? null,
      };
    }

    const unchanged = existingItem
      && existingItem.unit_cost === item.unitCost
      && existingItem.cost_source === item.costSource;

    return {
      ...item,
      costCapturedAt: unchanged ? existingItem.cost_captured_at : null,
    };
  };
  const itemsForWrite = [
    ...input.laborItems.map(protectInternalCosts),
    ...input.partItems.map(protectInternalCosts),
  ];

  const nextVersion = existingQuote ? Number(existingQuote.version ?? 1) + (wasIssued && clientChanged ? 1 : 0) : 1;
  const nextStatus = wasIssued && clientChanged ? ("draft" as const) : input.status;
  const timestamps = buildQuoteTimestamps(nextStatus, wasIssued && clientChanged ? null : existingQuote);
  const issuedAt = nextStatus === "sent" || nextStatus === "approved" ? existingQuote?.issued_at ?? new Date().toISOString() : null;
  const defaultValidity = workshop.default_quote_validity_days;
  const validUntil = input.validUntil || (defaultValidity && issuedAt
    ? new Date(new Date(issuedAt).getTime() + defaultValidity * 86400000).toISOString().slice(0, 10)
    : null);

  const payload = {
    workshop_id: workshop.id,
    client_id: input.clientId,
    vehicle_id: input.vehicleId,
    title: buildQuoteTitle(vehicle),
    status: nextStatus,
    subtotal: input.subtotal,
    total_amount: input.total,
    notes: input.notes || null,
    document_number: existingQuote?.document_number ?? buildQuoteDocumentNumber(),
    version: nextVersion,
    issued_at: issuedAt,
    valid_until: validUntil,
    discount_amount: input.discountAmount,
    tax_status: input.taxStatus,
    tax_label: input.taxLabel ?? workshop.default_tax_label,
    tax_rate: input.taxRate,
    tax_amount: input.taxAmount,
    sent_at: timestamps.sentAt,
    approved_at: timestamps.approvedAt,
    public_share_enabled: wasIssued && clientChanged ? false : existingQuote?.public_share_enabled,
    deleted_at: null,
  };

  const query = quoteId
    ? supabase.from("quotes").update(payload).eq("id", quoteId).eq("workshop_id", workshop.id)
    : supabase.from("quotes").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw new QuoteDataError("No se pudo guardar el presupuesto.", error);
  }

  const quote = data as QuoteRecord;
  const itemsPayload = formatQuoteItemsForInsert(quote.id, workshop.id, itemsForWrite);

  if (quoteId) {
    const { error: deleteError } = await supabase
      .from("quote_items")
      .delete()
      .eq("quote_id", quote.id)
      .eq("workshop_id", workshop.id);

    if (deleteError && !isMissingRelationError(deleteError)) {
      throw new QuoteDataError("No se pudieron actualizar los items del presupuesto.", deleteError);
    }
  }

  if (itemsPayload.length) {
    const { error: itemsInsertError } = await supabase.from("quote_items").insert(itemsPayload);

    if (itemsInsertError) {
      throw new QuoteDataError("No se pudieron guardar los items del presupuesto.", itemsInsertError);
    }
  }

  if (quote.status === "sent" || quote.status === "approved") {
    const current = await loadQuoteSnapshot(quote.id, workshop.id);
    if (current.quote) await preserveIssuedRevision(current.quote, current.items);
  }

  return {
    ...normalizeQuoteRecord(quote),
  };
}

export async function updateQuoteLifecycle(
  quoteId: string,
  action: "archive" | "restore" | "delete",
) {
  const { workshop } = await requireWorkshopOperation("quotes.manage");
  const supabase = await createSupabaseSessionClient();
  const now = new Date().toISOString();

  if (!(["archive", "restore", "delete"] as string[]).includes(action)) {
    throw new QuoteDataError("No se pudo actualizar el presupuesto.", new Error("Invalid quote lifecycle action"));
  }

  const payload =
    action === "archive"
      ? { archived_at: now }
      : action === "restore"
        ? { archived_at: null }
        : { deleted_at: now };

  const { data, error } = await supabase
    .from("quotes")
    .update(payload)
    .eq("workshop_id", workshop.id)
    .eq("id", quoteId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new QuoteDataError("No se pudo actualizar el presupuesto.", error);
  }

  if (!data) {
    throw new QuoteInputError("quote_not_available");
  }

  return normalizeQuoteRecord(data as QuoteRecord);
}

export async function ensureQuotePublicShare(quoteId: string) {
  const { workshop } = await requireWorkshopOperation("quotes.manage");
  const supabase = await createSupabaseSessionClient();

  const { data: existingData, error: existingError } = await supabase
    .from("quotes")
    .select("id,status,sent_at,public_share_token")
    .eq("workshop_id", workshop.id)
    .eq("id", quoteId)
    .maybeSingle();

  if (existingError) {
    throw new QuoteDataError("No se pudo validar el presupuesto.", existingError);
  }

  const existing = existingData as Pick<
    QuoteRecord,
    "id" | "status" | "sent_at" | "public_share_token"
  > | null;

  if (!existing) {
    throw new QuoteInputError("quote_not_available");
  }

  const payload = {
    public_share_enabled: true,
    public_shared_at: new Date().toISOString(),
    sent_at: existing.sent_at ?? new Date().toISOString(),
    issued_at: existing.sent_at ?? new Date().toISOString(),
    status: existing.status === "draft" ? ("sent" as const) : existing.status,
  };

  const { data, error } = await supabase
    .from("quotes")
    .update(payload)
    .eq("workshop_id", workshop.id)
    .eq("id", quoteId)
    .select("public_share_token")
    .single();

  if (error) {
    throw new QuoteDataError("No se pudo preparar el link del presupuesto.", error);
  }

  const token = (data as { public_share_token: string | null }).public_share_token;

  if (!token) {
    throw new QuoteDataError(
      "No se pudo preparar el link del presupuesto.",
      new Error("Quote share token was not generated"),
    );
  }

  const snapshot = await loadQuoteSnapshot(quoteId, workshop.id);
  if (snapshot.quote) await preserveIssuedRevision(snapshot.quote, snapshot.items);

  return {
    token,
    path: buildPublicQuotePath(token),
    documentPath: buildPublicQuoteDocumentPath(token),
  };
}

export function getQuoteDetailHref(quoteId: string) {
  return `/app/quotes/${quoteId}` as Route;
}

export function getQuoteEditHref(quoteId: string) {
  return `/app/quotes/${quoteId}/edit` as Route;
}

export function getQuoteDocumentHref(quoteId: string) {
  return `/app/quotes/${quoteId}/document` as Route;
}

export function buildQuoteFormDefaults(
  options: QuoteFormOptions,
  source?: {
    quote?: QuoteRecord;
    laborItems?: QuoteItemRecord[];
    partItems?: QuoteItemRecord[];
    selectedClientId?: string;
    selectedVehicleId?: string;
  },
): QuoteFormValues {
  const selectedClientId = source?.quote?.client_id ?? source?.selectedClientId ?? options.clients[0]?.id ?? "";
  const preferredVehicleId =
    source?.quote?.vehicle_id ??
    source?.selectedVehicleId ??
    options.vehicles.find((vehicle) => vehicle.clientId === selectedClientId)?.id ??
    "";

  return {
    clientId: selectedClientId,
    vehicleId: preferredVehicleId,
    status: source?.quote?.status ?? "draft",
    notes: source?.quote?.notes ?? "",
    validUntil: source?.quote?.valid_until ?? "",
    discountAmount: String(source?.quote?.discount_amount ?? 0),
    taxStatus: source?.quote?.tax_status ?? "pending",
    taxLabel: source?.quote?.tax_label ?? "",
    taxRate: source?.quote?.tax_rate == null ? "" : String(source.quote.tax_rate),
    laborItems:
      source?.laborItems?.map((item) => ({
        rowId: item.id,
        inventoryItemId: "",
        itemType: "labor",
        description: item.description,
        workGroup: item.work_group || "Trabajo general",
        unit: item.unit_label || "servicio",
        unitCost: item.unit_cost == null ? "" : String(item.unit_cost),
        costSource: item.cost_source || "manual",
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
      })) ?? [
        {
        rowId: crypto.randomUUID(),
        inventoryItemId: "",
        itemType: "labor",
        description: "",
        workGroup: "Trabajo general",
        unit: "servicio",
        unitCost: "",
        costSource: "manual",
        quantity: "1",
          unitPrice: "",
        },
      ],
    partItems:
      source?.partItems?.map((item) => ({
        rowId: item.id,
        inventoryItemId: item.inventory_item_id ?? "",
        itemType: "part",
        description: item.description,
        workGroup: item.work_group || "Trabajo general",
        unit: item.unit_label || "unidad",
        unitCost: item.unit_cost == null ? "" : String(item.unit_cost),
        costSource: item.cost_source || "manual",
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
      })) ?? [
        {
          rowId: crypto.randomUUID(),
          inventoryItemId: "",
          itemType: "part",
          description: "",
          workGroup: "Trabajo general",
          unit: "unidad",
          unitCost: "",
          costSource: "manual",
          quantity: "1",
          unitPrice: "",
        },
      ],
  };
}

export async function requireQuoteOrRedirect(quoteId: string) {
  try {
    return await getQuoteDetail(quoteId);
  } catch {
    redirect("/app/quotes" as Route);
  }
}
