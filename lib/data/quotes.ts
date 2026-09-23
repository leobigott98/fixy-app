import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireWorkshopOperation } from "@/lib/data/workshops";
import { buildPublicQuoteDocumentPath, buildPublicQuotePath } from "@/lib/share-links";
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
  const { workshop } = await requireWorkshopOperation("quotes.view");
  const supabase = await createSupabaseDataClient();

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
      .select("id,name,sku,stock_quantity,reference_sale_price")
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
  }> | null) ?? []).map((item) => {
    const stockQuantity = Number(item.stock_quantity ?? 0);

    return {
      id: item.id,
      name: item.name,
      stockQuantity,
      referenceSalePrice: Number(item.reference_sale_price ?? 0),
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
  const supabase = await createSupabaseDataClient();
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
  const supabase = await createSupabaseDataClient();

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
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    if (!isMissingRelationError(itemsError)) {
      throw new QuoteDataError("No se pudieron cargar los items del presupuesto.", itemsError);
    }
  }

  const items = ((itemsData as QuoteItemRecord[] | null) ?? []).map((item) => ({
    ...item,
    quantity: Number(item.quantity ?? 0),
    unit_price: Number(item.unit_price ?? 0),
    line_total: Number(item.line_total ?? 0),
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

  return detail;
}

function formatQuoteItemsForInsert(quoteId: string, workshopId: string, items: QuoteItemInput[]) {
  return items.map((item) => ({
    quote_id: quoteId,
    workshop_id: workshopId,
    inventory_item_id: item.itemType === "part" ? item.inventoryItemId ?? null : null,
    item_type: item.itemType,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
    sort_order: item.sortOrder,
  }));
}

async function validateQuoteRelations(input: QuoteInput, workshopId: string) {
  const supabase = await createSupabaseDataClient();

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

export async function upsertQuote(inputValues: QuoteFormValues, quoteId?: string) {
  const { workshop } = await requireWorkshopOperation("quotes.manage");
  const input = normalizeQuoteInput(inputValues);
  const { supabase, vehicle } = await validateQuoteRelations(input, workshop.id);

  let existingQuote: Pick<QuoteRecord, "sent_at" | "approved_at"> | null = null;

  if (quoteId) {
    const { data, error: existingQuoteError } = await supabase
      .from("quotes")
      .select("sent_at,approved_at")
      .eq("workshop_id", workshop.id)
      .eq("id", quoteId)
      .maybeSingle();

    if (existingQuoteError) {
      throw new QuoteDataError("No se pudo validar el presupuesto.", existingQuoteError);
    }

    existingQuote = (data as Pick<QuoteRecord, "sent_at" | "approved_at"> | null) ?? null;

    if (!existingQuote) {
      throw new QuoteInputError("quote_not_available");
    }
  }

  const timestamps = buildQuoteTimestamps(input.status, existingQuote);

  const payload = {
    workshop_id: workshop.id,
    client_id: input.clientId,
    vehicle_id: input.vehicleId,
    title: buildQuoteTitle(vehicle),
    status: input.status,
    subtotal: input.subtotal,
    total_amount: input.total,
    notes: input.notes || null,
    sent_at: timestamps.sentAt,
    approved_at: timestamps.approvedAt,
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
  const itemsPayload = formatQuoteItemsForInsert(quote.id, workshop.id, [
    ...input.laborItems,
    ...input.partItems,
  ]);

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

  return {
    ...normalizeQuoteRecord(quote),
  };
}

export async function updateQuoteLifecycle(
  quoteId: string,
  action: "archive" | "restore" | "delete",
) {
  const { workshop } = await requireWorkshopOperation("quotes.manage");
  const supabase = await createSupabaseDataClient();
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
  const supabase = await createSupabaseDataClient();

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
    laborItems:
      source?.laborItems?.map((item) => ({
        rowId: item.id,
        inventoryItemId: "",
        itemType: "labor",
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
      })) ?? [
        {
        rowId: crypto.randomUUID(),
        inventoryItemId: "",
        itemType: "labor",
        description: "",
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
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
      })) ?? [
        {
          rowId: crypto.randomUUID(),
          inventoryItemId: "",
          itemType: "part",
          description: "",
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
