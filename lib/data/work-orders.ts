import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { getMechanicAssignmentOptions, type MechanicRecord } from "@/lib/data/mechanics";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { isCollectedPaymentStatus } from "@/lib/finances/constants";
import type { QuoteItemRecord, QuoteRecord } from "@/lib/data/quotes";
import { normalizeWorkOrderInput, type WorkOrderFormValues, type WorkOrderInput } from "@/lib/work-orders/schema";

export type WorkOrderRecord = {
  id: string;
  workshop_id: string;
  client_id: string | null;
  vehicle_id: string | null;
  quote_id: string | null;
  code: string | null;
  title: string;
  vehicle_label: string | null;
  status:
    | "presupuesto_pendiente"
    | "diagnostico_pendiente"
    | "en_reparacion"
    | "listo_para_entrega"
    | "completada"
    | "cancelada";
  promised_date: string | null;
  total_amount: number;
  bay_slot: number | null;
  assigned_mechanic_id: string | null;
  assigned_mechanic_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkOrderServiceRecord = {
  id: string;
  work_order_id: string;
  workshop_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

export type WorkOrderPartRecord = WorkOrderServiceRecord;

export type WorkOrderReferencePhotoRecord = {
  id: string;
  work_order_id: string;
  workshop_id: string;
  photo_url: string;
  sort_order: number;
  created_at: string;
};

export type WorkOrderStatusHistoryRecord = {
  id: string;
  work_order_id: string;
  workshop_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_at: string;
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

type QuoteLite = {
  id: string;
  title: string;
  status: string;
  total_amount: number | string | null;
};

type PaymentLite = {
  amount: number | string | null;
  status: string | null;
};

type MechanicLite = Pick<MechanicRecord, "id" | "full_name" | "role" | "photo_url" | "is_active">;

type WorkOrderRowWithRelations = WorkOrderRecord & {
  clients: ClientLite | ClientLite[] | null;
  vehicles: VehicleLite | VehicleLite[] | null;
  quotes: QuoteLite | QuoteLite[] | null;
  mechanics: MechanicLite | MechanicLite[] | null;
};

export type WorkOrderListItem = WorkOrderRecord & {
  client: ClientLite | null;
  vehicle: VehicleLite | null;
  quote: QuoteLite | null;
  assignedMechanicName: string | null;
  serviceCount: number;
  partCount: number;
};

export type WorkOrdersBoardData = {
  grouped: Record<WorkOrderRecord["status"], WorkOrderListItem[]>;
  orderedStatuses: WorkOrderRecord["status"][];
};

export type WorkOrderDetailData = {
  workOrder: WorkOrderRecord;
  client: ClientLite | null;
  vehicle: VehicleLite | null;
  quote: QuoteLite | null;
  services: WorkOrderServiceRecord[];
  parts: WorkOrderPartRecord[];
  referencePhotos: WorkOrderReferencePhotoRecord[];
  statusHistory: WorkOrderStatusHistoryRecord[];
  paymentSummary: {
    totalCollected: number;
    paymentCount: number;
    pendingBalance: number;
  };
};

export type WorkOrderFormOptions = {
  clients: Array<{
    id: string;
    fullName: string;
  }>;
  vehicles: Array<{
    id: string;
    clientId: string | null;
    label: string;
  }>;
  approvedQuotes: Array<{
    id: string;
    clientId: string | null;
    vehicleId: string | null;
    title: string;
  }>;
  mechanics: Array<{
    id: string;
    label: string;
    fullName: string;
  }>;
};

function toSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function getWorkOrderStatusLabel(status: WorkOrderRecord["status"]) {
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

export function getWorkOrderStatusVariant(status: WorkOrderRecord["status"]) {
  switch (status) {
    case "en_reparacion":
      return "primary" as const;
    case "listo_para_entrega":
    case "completada":
      return "success" as const;
    default:
      return "default" as const;
  }
}

function getOrderedStatuses(): WorkOrderRecord["status"][] {
  return [
    "presupuesto_pendiente",
    "diagnostico_pendiente",
    "en_reparacion",
    "listo_para_entrega",
    "completada",
    "cancelada",
  ];
}

function buildWorkOrderTitle(vehicle: VehicleLite | null, quote?: QuoteLite | null) {
  if (quote?.title) {
    return quote.title.replace(/^Presupuesto/i, "Orden");
  }

  if (vehicle) {
    return `Orden ${vehicle.vehicle_label || [vehicle.make, vehicle.model, vehicle.plate].filter(Boolean).join(" ")}`;
  }

  return "Orden de trabajo";
}

function buildWorkOrderCode() {
  return `OT-${Date.now().toString().slice(-6)}`;
}

function normalizeWorkOrderRecord(record: WorkOrderRecord) {
  return {
    ...record,
    total_amount: Number(record.total_amount ?? 0),
  };
}

async function validateWorkOrderRelations(input: WorkOrderInput) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const [vehicleResult, quoteResult, mechanicResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id,client_id,vehicle_label,plate,make,model,vehicle_year")
      .eq("workshop_id", workshop.id)
      .eq("id", input.vehicleId)
      .maybeSingle(),
    input.quoteId
      ? supabase
          .from("quotes")
          .select("id,client_id,vehicle_id,title,status,total_amount")
          .eq("workshop_id", workshop.id)
          .eq("id", input.quoteId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.assignedMechanicId
      ? supabase
          .from("mechanics")
          .select("id,full_name,role,is_active,photo_url")
          .eq("workshop_id", workshop.id)
          .eq("id", input.assignedMechanicId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const relationError = [vehicleResult.error, quoteResult.error, mechanicResult.error].find(Boolean);

  if (relationError) {
    throw relationError;
  }

  const vehicle = (vehicleResult.data as VehicleLite | null) ?? null;

  if (!vehicle) {
    throw new Error("Selecciona un vehiculo valido.");
  }

  if (vehicle.client_id !== input.clientId) {
    throw new Error("El vehiculo seleccionado no pertenece al cliente.");
  }

  const quote = (quoteResult.data as QuoteLite & { client_id: string | null; vehicle_id: string | null } | null) ?? null;

  if (quote) {
    if (quote.client_id !== input.clientId || quote.vehicle_id !== input.vehicleId) {
      throw new Error("El presupuesto vinculado no coincide con cliente y vehiculo.");
    }
  }

  const mechanic = (mechanicResult.data as MechanicLite | null) ?? null;

  if (input.assignedMechanicId && !mechanic) {
    throw new Error("Selecciona un integrante valido.");
  }

  if (mechanic && !mechanic.is_active) {
    throw new Error("El integrante seleccionado esta inactivo.");
  }

  return {
    workshop,
    vehicle,
    quote,
    mechanic,
  };
}

async function insertStatusHistory(
  workOrderId: string,
  workshopId: string,
  fromStatus: string | null,
  toStatus: string,
  note?: string | null,
) {
  const supabase = await createSupabaseDataClient();
  const { error } = await supabase.from("work_order_status_history").insert({
    work_order_id: workOrderId,
    workshop_id: workshopId,
    from_status: fromStatus,
    to_status: toStatus,
    note: note ?? null,
  });

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

async function replaceWorkOrderItems(
  workOrderId: string,
  workshopId: string,
  services: WorkOrderInput["serviceItems"],
  parts: WorkOrderInput["partItems"],
) {
  const supabase = await createSupabaseDataClient();

  const [deleteServicesResult, deletePartsResult] = await Promise.all([
    supabase.from("work_order_services").delete().eq("work_order_id", workOrderId).eq("workshop_id", workshopId),
    supabase.from("work_order_parts").delete().eq("work_order_id", workOrderId).eq("workshop_id", workshopId),
  ]);

  const nonMissingDeleteError = [deleteServicesResult.error, deletePartsResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingDeleteError) {
    throw nonMissingDeleteError;
  }

  if (services.length) {
    const { error } = await supabase.from("work_order_services").insert(
      services.map((item) => ({
        work_order_id: workOrderId,
        workshop_id: workshopId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        sort_order: item.sortOrder,
      })),
    );

    if (error) {
      throw error;
    }
  }

  if (parts.length) {
    const { error } = await supabase.from("work_order_parts").insert(
      parts.map((item) => ({
        work_order_id: workOrderId,
        workshop_id: workshopId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
        sort_order: item.sortOrder,
      })),
    );

    if (error) {
      throw error;
    }
  }
}

async function replaceReferencePhotos(
  workOrderId: string,
  workshopId: string,
  photoUrls: string[],
) {
  const supabase = await createSupabaseDataClient();
  const { error: deleteError } = await supabase
    .from("work_order_reference_photos")
    .delete()
    .eq("work_order_id", workOrderId)
    .eq("workshop_id", workshopId);

  if (deleteError && !isMissingRelationError(deleteError)) {
    throw deleteError;
  }

  if (!photoUrls.length) {
    return;
  }

  const { error } = await supabase.from("work_order_reference_photos").insert(
    photoUrls.map((photoUrl, index) => ({
      work_order_id: workOrderId,
      workshop_id: workshopId,
      photo_url: photoUrl,
      sort_order: index,
    })),
  );

  if (error) {
    throw error;
  }
}

export async function getWorkOrderFormOptions(): Promise<WorkOrderFormOptions> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const [clientsResult, vehiclesResult, quotesResult, mechanics] = await Promise.all([
    supabase.from("clients").select("id,full_name").eq("workshop_id", workshop.id).order("full_name"),
    supabase
      .from("vehicles")
      .select("id,client_id,vehicle_label,plate,make,model,vehicle_year")
      .eq("workshop_id", workshop.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id,client_id,vehicle_id,title")
      .eq("workshop_id", workshop.id)
      .eq("status", "approved")
      .order("approved_at", { ascending: false }),
    getMechanicAssignmentOptions(),
  ]);

  const nonMissingError = [clientsResult.error, vehiclesResult.error, quotesResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  return {
    clients: (((clientsResult.data as Array<{ id: string; full_name: string }> | null) ?? []).map((client) => ({
      id: client.id,
      fullName: client.full_name,
    }))),
    vehicles: (((vehiclesResult.data as VehicleLite[] | null) ?? []).map((vehicle) => ({
      id: vehicle.id,
      clientId: vehicle.client_id,
      label:
        vehicle.vehicle_label ??
        [vehicle.make, vehicle.model, vehicle.vehicle_year, vehicle.plate].filter(Boolean).join(" "),
    }))),
    approvedQuotes: (((quotesResult.data as Array<{
      id: string;
      client_id: string | null;
      vehicle_id: string | null;
      title: string;
    }> | null) ?? []).map((quote) => ({
      id: quote.id,
      clientId: quote.client_id,
      vehicleId: quote.vehicle_id,
      title: quote.title,
    }))),
    mechanics,
  };
}

export async function getWorkOrdersList(search?: string): Promise<WorkOrderListItem[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const query = search?.trim().toLowerCase() ?? "";

  const { data, error } = await supabase
    .from("work_orders")
    .select("*, clients(id,full_name,whatsapp_phone), vehicles(id,client_id,vehicle_label,plate,make,model,vehicle_year), quotes(id,title,status,total_amount), mechanics(id,full_name,role,photo_url,is_active)")
    .eq("workshop_id", workshop.id)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  const rows = ((data as WorkOrderRowWithRelations[] | null) ?? []).map((row) => ({
    ...normalizeWorkOrderRecord(row),
    client: toSingleRelation(row.clients),
    vehicle: toSingleRelation(row.vehicles),
    quote: toSingleRelation(row.quotes),
    assignedMechanicName:
      toSingleRelation(row.mechanics)?.full_name ?? row.assigned_mechanic_name,
  }));

  const filteredRows = rows.filter((row) => {
    if (!query) {
      return true;
    }

    const haystack = [
      row.code ?? "",
      row.title,
      row.notes ?? "",
      getWorkOrderStatusLabel(row.status),
      row.client?.full_name ?? "",
      row.vehicle?.vehicle_label ?? "",
      row.vehicle?.plate ?? "",
      row.assignedMechanicName ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  if (!filteredRows.length) {
    return [];
  }

  const workOrderIds = filteredRows.map((order) => order.id);
  const [servicesResult, partsResult] = await Promise.all([
    supabase.from("work_order_services").select("work_order_id").eq("workshop_id", workshop.id).in("work_order_id", workOrderIds),
    supabase.from("work_order_parts").select("work_order_id").eq("workshop_id", workshop.id).in("work_order_id", workOrderIds),
  ]);

  const nonMissingCountError = [servicesResult.error, partsResult.error].find(
    (resultError) => resultError && !isMissingRelationError(resultError),
  );

  if (nonMissingCountError) {
    throw nonMissingCountError;
  }

  const serviceCounts = (((servicesResult.data as Array<{ work_order_id: string }> | null) ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.work_order_id] = (acc[item.work_order_id] ?? 0) + 1;
      return acc;
    },
    {},
  ));

  const partCounts = (((partsResult.data as Array<{ work_order_id: string }> | null) ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.work_order_id] = (acc[item.work_order_id] ?? 0) + 1;
      return acc;
    },
    {},
  ));

  return filteredRows.map((row) => ({
    ...row,
    serviceCount: serviceCounts[row.id] ?? 0,
    partCount: partCounts[row.id] ?? 0,
  }));
}

export async function getWorkOrdersBoardData(search?: string): Promise<WorkOrdersBoardData> {
  const list = await getWorkOrdersList(search);
  const orderedStatuses = getOrderedStatuses();

  const grouped = orderedStatuses.reduce<Record<WorkOrderRecord["status"], WorkOrderListItem[]>>(
    (acc, status) => {
      acc[status] = [];
      return acc;
    },
    {
      presupuesto_pendiente: [],
      diagnostico_pendiente: [],
      en_reparacion: [],
      listo_para_entrega: [],
      completada: [],
      cancelada: [],
    },
  );

  list.forEach((order) => {
    grouped[order.status].push(order);
  });

  return {
    grouped,
    orderedStatuses,
  };
}

export async function getWorkOrderDetail(workOrderId: string): Promise<WorkOrderDetailData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data: workOrderData, error: workOrderError } = await supabase
    .from("work_orders")
    .select("*, clients(id,full_name,whatsapp_phone), vehicles(id,client_id,vehicle_label,plate,make,model,vehicle_year), quotes(id,title,status,total_amount), mechanics(id,full_name,role,photo_url,is_active)")
    .eq("workshop_id", workshop.id)
    .eq("id", workOrderId)
    .maybeSingle();

  if (workOrderError) {
    if (isMissingRelationError(workOrderError)) {
      notFound();
    }

    throw workOrderError;
  }

  const workOrderRow = workOrderData as WorkOrderRowWithRelations | null;

  if (!workOrderRow) {
    notFound();
  }

  const [servicesResult, partsResult, referencePhotosResult, statusHistoryResult, paymentsResult] = await Promise.all([
    supabase.from("work_order_services").select("*").eq("workshop_id", workshop.id).eq("work_order_id", workOrderId).order("sort_order"),
    supabase.from("work_order_parts").select("*").eq("workshop_id", workshop.id).eq("work_order_id", workOrderId).order("sort_order"),
    supabase
      .from("work_order_reference_photos")
      .select("*")
      .eq("workshop_id", workshop.id)
      .eq("work_order_id", workOrderId)
      .order("sort_order"),
    supabase
      .from("work_order_status_history")
      .select("*")
      .eq("workshop_id", workshop.id)
      .eq("work_order_id", workOrderId)
      .order("changed_at", { ascending: false }),
    supabase.from("payments").select("amount,status").eq("workshop_id", workshop.id).eq("work_order_id", workOrderId),
  ]);

  const nonMissingError = [servicesResult.error, partsResult.error, referencePhotosResult.error, statusHistoryResult.error, paymentsResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const payments = (paymentsResult.data as PaymentLite[] | null) ?? [];
  const totalCollected = payments
    .filter((payment) => isCollectedPaymentStatus(payment.status))
    .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

  return {
    workOrder: normalizeWorkOrderRecord(workOrderRow),
    client: toSingleRelation(workOrderRow.clients),
    vehicle: toSingleRelation(workOrderRow.vehicles),
    quote: toSingleRelation(workOrderRow.quotes),
    services: ((servicesResult.data as WorkOrderServiceRecord[] | null) ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      line_total: Number(item.line_total ?? 0),
    })),
    parts: ((partsResult.data as WorkOrderPartRecord[] | null) ?? []).map((item) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      line_total: Number(item.line_total ?? 0),
    })),
    referencePhotos: (referencePhotosResult.data as WorkOrderReferencePhotoRecord[] | null) ?? [],
    statusHistory: (statusHistoryResult.data as WorkOrderStatusHistoryRecord[] | null) ?? [],
    paymentSummary: {
      paymentCount: payments.length,
      totalCollected,
      pendingBalance: Math.max(Number((Number(workOrderRow.total_amount ?? 0) - totalCollected).toFixed(2)), 0),
    },
  };
}

export async function getWorkOrderForEdit(workOrderId: string) {
  return getWorkOrderDetail(workOrderId);
}

export async function upsertWorkOrder(inputValues: WorkOrderFormValues, workOrderId?: string) {
  const input = normalizeWorkOrderInput(inputValues);
  const { workshop, vehicle, quote, mechanic } = await validateWorkOrderRelations(input);
  const supabase = await createSupabaseDataClient();

  let existingWorkOrder: Pick<WorkOrderRecord, "status" | "code"> | null = null;

  if (workOrderId) {
    const { data } = await supabase
      .from("work_orders")
      .select("status,code")
      .eq("workshop_id", workshop.id)
      .eq("id", workOrderId)
      .maybeSingle();

    existingWorkOrder = (data as Pick<WorkOrderRecord, "status" | "code"> | null) ?? null;
  }

  const payload = {
    workshop_id: workshop.id,
    client_id: input.clientId,
    vehicle_id: input.vehicleId,
    quote_id: input.quoteId ?? null,
    code: existingWorkOrder?.code ?? buildWorkOrderCode(),
    title: input.title || buildWorkOrderTitle(vehicle, quote),
    vehicle_label:
      vehicle.vehicle_label ??
      [vehicle.make, vehicle.model, vehicle.vehicle_year, vehicle.plate].filter(Boolean).join(" "),
    status: input.status,
    promised_date: input.promisedDate ?? null,
    total_amount: input.total,
    assigned_mechanic_id: mechanic?.id ?? null,
    assigned_mechanic_name: mechanic?.full_name ?? null,
    notes: input.notes || null,
  };

  const query = workOrderId
    ? supabase.from("work_orders").update(payload).eq("id", workOrderId).eq("workshop_id", workshop.id)
    : supabase.from("work_orders").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  const workOrder = normalizeWorkOrderRecord(data as WorkOrderRecord);
  await replaceWorkOrderItems(workOrder.id, workshop.id, input.serviceItems, input.partItems);
  await replaceReferencePhotos(workOrder.id, workshop.id, input.referencePhotoUrls);

  if (!workOrderId) {
    await insertStatusHistory(workOrder.id, workshop.id, null, input.status, "Orden creada");
  } else if (existingWorkOrder?.status !== input.status) {
    await insertStatusHistory(workOrder.id, workshop.id, existingWorkOrder?.status ?? null, input.status, "Cambio de estado desde edicion");
  }

  return workOrder;
}

export async function updateWorkOrderStatus(workOrderId: string, status: WorkOrderRecord["status"]) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data: existingData, error: existingError } = await supabase
    .from("work_orders")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("id", workOrderId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const existing = existingData as WorkOrderRecord | null;

  if (!existing) {
    throw new Error("Orden no encontrada.");
  }

  if (existing.status === status) {
    return normalizeWorkOrderRecord(existing);
  }

  const { data, error } = await supabase
    .from("work_orders")
    .update({ status })
    .eq("id", workOrderId)
    .eq("workshop_id", workshop.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await insertStatusHistory(workOrderId, workshop.id, existing.status, status, "Cambio manual de etapa");

  return normalizeWorkOrderRecord(data as WorkOrderRecord);
}

export async function createWorkOrderFromApprovedQuote(quoteId: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const existingLinkedWorkOrderResult = await supabase
    .from("work_orders")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (existingLinkedWorkOrderResult.error && !isMissingRelationError(existingLinkedWorkOrderResult.error)) {
    throw existingLinkedWorkOrderResult.error;
  }

  const existingLinkedWorkOrder = (existingLinkedWorkOrderResult.data as WorkOrderRecord | null) ?? null;

  if (existingLinkedWorkOrder) {
    return normalizeWorkOrderRecord(existingLinkedWorkOrder);
  }

  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select("*, vehicles(id,client_id,vehicle_label,plate,make,model,vehicle_year)")
    .eq("workshop_id", workshop.id)
    .eq("id", quoteId)
    .maybeSingle();

  if (quoteError) {
    throw quoteError;
  }

  const quote = quoteData as (QuoteRecord & { vehicles: VehicleLite | VehicleLite[] | null }) | null;

  if (!quote || quote.status !== "approved") {
    throw new Error("Solo puedes convertir presupuestos aprobados.");
  }

  const vehicle = toSingleRelation(quote.vehicles);

  if (!vehicle || !quote.client_id || !quote.vehicle_id) {
    throw new Error("El presupuesto debe tener cliente y vehiculo vinculados.");
  }

  const { data: quoteItemsData, error: quoteItemsError } = await supabase
    .from("quote_items")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("quote_id", quoteId)
    .order("sort_order");

  if (quoteItemsError && !isMissingRelationError(quoteItemsError)) {
    throw quoteItemsError;
  }

  const quoteItems = (quoteItemsData as QuoteItemRecord[] | null) ?? [];

  const payload = {
    workshop_id: workshop.id,
    client_id: quote.client_id,
    vehicle_id: quote.vehicle_id,
    quote_id: quote.id,
    code: buildWorkOrderCode(),
    title: buildWorkOrderTitle(vehicle, {
      id: quote.id,
      title: quote.title,
      status: quote.status,
      total_amount: quote.total_amount,
    }),
    vehicle_label:
      vehicle.vehicle_label ??
      [vehicle.make, vehicle.model, vehicle.vehicle_year, vehicle.plate].filter(Boolean).join(" "),
    status: "diagnostico_pendiente" as const,
    promised_date: null,
    total_amount: Number(quote.total_amount ?? 0),
    assigned_mechanic_id: null,
    assigned_mechanic_name: null,
    notes: quote.notes ?? null,
  };

  const { data: workOrderData, error: workOrderError } = await supabase
    .from("work_orders")
    .insert(payload)
    .select("*")
    .single();

  if (workOrderError) {
    throw workOrderError;
  }

  const workOrder = normalizeWorkOrderRecord(workOrderData as WorkOrderRecord);

  const services = quoteItems.filter((item) => item.item_type === "labor");
  const parts = quoteItems.filter((item) => item.item_type === "part");

  if (services.length) {
    const { error } = await supabase.from("work_order_services").insert(
      services.map((item) => ({
        work_order_id: workOrder.id,
        workshop_id: workshop.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        sort_order: item.sort_order,
      })),
    );

    if (error) {
      throw error;
    }
  }

  if (parts.length) {
    const { error } = await supabase.from("work_order_parts").insert(
      parts.map((item) => ({
        work_order_id: workOrder.id,
        workshop_id: workshop.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        sort_order: item.sort_order,
      })),
    );

    if (error) {
      throw error;
    }
  }

  await insertStatusHistory(workOrder.id, workshop.id, null, "diagnostico_pendiente", "Orden creada desde presupuesto aprobado");

  return workOrder;
}

export function buildWorkOrderFormDefaults(
  options: WorkOrderFormOptions,
  source?: {
    workOrder?: WorkOrderRecord;
    services?: WorkOrderServiceRecord[];
    parts?: WorkOrderPartRecord[];
    referencePhotos?: WorkOrderReferencePhotoRecord[];
    selectedClientId?: string;
    selectedVehicleId?: string;
    selectedQuoteId?: string;
  },
): WorkOrderFormValues {
  const selectedClientId = source?.workOrder?.client_id ?? source?.selectedClientId ?? options.clients[0]?.id ?? "";
  const preferredVehicleId =
    source?.workOrder?.vehicle_id ??
    source?.selectedVehicleId ??
    options.vehicles.find((vehicle) => vehicle.clientId === selectedClientId)?.id ??
    "";

  return {
    clientId: selectedClientId,
    vehicleId: preferredVehicleId,
    quoteId: source?.workOrder?.quote_id ?? source?.selectedQuoteId ?? "",
    title: source?.workOrder?.title ?? "",
    status: source?.workOrder?.status ?? "diagnostico_pendiente",
    assignedMechanicId: source?.workOrder?.assigned_mechanic_id ?? "",
    promisedDate: source?.workOrder?.promised_date ?? "",
    notes: source?.workOrder?.notes ?? "",
    referencePhotoUrls: source?.referencePhotos?.map((photo) => photo.photo_url) ?? [],
    serviceItems:
      source?.services?.map((item) => ({
        rowId: item.id,
        itemType: "service",
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
      })) ?? [
        {
          rowId: crypto.randomUUID(),
          itemType: "service",
          description: "",
          quantity: "1",
          unitPrice: "",
        },
      ],
    partItems:
      source?.parts?.map((item) => ({
        rowId: item.id,
        itemType: "part",
        description: item.description,
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price),
      })) ?? [],
  };
}

export function getWorkOrderDetailHref(workOrderId: string) {
  return `/app/work-orders/${workOrderId}` as Route;
}

export function getWorkOrderEditHref(workOrderId: string) {
  return `/app/work-orders/${workOrderId}/edit` as Route;
}

export async function requireWorkOrderOrRedirect(workOrderId: string) {
  try {
    return await getWorkOrderDetail(workOrderId);
  } catch {
    redirect("/app/work-orders" as Route);
  }
}
