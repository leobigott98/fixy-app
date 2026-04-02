import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { isCollectedPaymentStatus } from "@/lib/finances/constants";
import { buildVehicleLabel, type VehicleProfileInput } from "@/lib/vehicles/schema";

export type VehicleRecord = {
  id: string;
  workshop_id: string;
  client_id: string | null;
  vehicle_label: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  vehicle_year: number | null;
  color: string | null;
  mileage: number | null;
  vin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type VehiclePhotoRecord = {
  id: string;
  vehicle_id: string;
  workshop_id: string;
  photo_url: string;
  sort_order: number;
  created_at: string;
};

type ClientLite = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
};

type QuoteLiteRow = {
  id: string;
  vehicle_id: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  created_at: string;
};

type WorkOrderLiteRow = {
  id: string;
  vehicle_id: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  updated_at: string;
};

type CompletedWorkOrderHistoryRow = {
  id: string;
  vehicle_id: string | null;
  code: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  notes: string | null;
  assigned_mechanic_name: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type WorkOrderHistoryItemRow = {
  work_order_id: string;
  description: string;
  quantity: number | string | null;
  unit_price: number | string | null;
  line_total: number | string | null;
  sort_order: number;
};

type PaymentHistorySummaryRow = {
  work_order_id: string | null;
  amount: number | string | null;
  status: string | null;
  paid_at: string;
};

export type VehicleRepairHistoryEntry = {
  workOrder: CompletedWorkOrderHistoryRow & {
    total_amount: number;
  };
  services: Array<WorkOrderHistoryItemRow & {
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  parts: Array<WorkOrderHistoryItemRow & {
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  paymentSummary: {
    totalCollected: number;
    paymentCount: number;
    pendingBalance: number;
    latestPaymentAt: string | null;
  };
};

export type VehicleListItem = VehicleRecord & {
  owner: ClientLite | null;
  quoteCount: number;
  workOrderCount: number;
};

export type VehicleDetailData = {
  vehicle: VehicleRecord;
  owner: ClientLite | null;
  quotes: QuoteLiteRow[];
  workOrders: WorkOrderLiteRow[];
  photos: VehiclePhotoRecord[];
  repairHistory: VehicleRepairHistoryEntry[];
};

async function replaceVehiclePhotos(
  vehicleId: string,
  workshopId: string,
  photoUrls: string[],
) {
  const supabase = await createSupabaseDataClient();
  const { error: deleteError } = await supabase
    .from("vehicle_photos")
    .delete()
    .eq("vehicle_id", vehicleId)
    .eq("workshop_id", workshopId);

  if (deleteError && !isMissingRelationError(deleteError)) {
    throw deleteError;
  }

  if (!photoUrls.length) {
    return;
  }

  const { error } = await supabase.from("vehicle_photos").insert(
    photoUrls.map((photoUrl, index) => ({
      vehicle_id: vehicleId,
      workshop_id: workshopId,
      photo_url: photoUrl,
      sort_order: index,
    })),
  );

  if (error) {
    throw error;
  }
}

function normalizeHistoryItem<T extends WorkOrderHistoryItemRow>(item: T) {
  return {
    ...item,
    quantity: Number(item.quantity ?? 0),
    unit_price: Number(item.unit_price ?? 0),
    line_total: Number(item.line_total ?? 0),
  };
}

export async function getVehicleOwnerOptions() {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("clients")
    .select("id,full_name")
    .eq("workshop_id", workshop.id)
    .order("full_name", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return ((data as Array<{ id: string; full_name: string }> | null) ?? []).map((client) => ({
    id: client.id,
    fullName: client.full_name,
  }));
}

export async function getVehiclesList(search?: string): Promise<VehicleListItem[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const query = search?.trim() ?? "";

  let vehiclesQuery = supabase
    .from("vehicles")
    .select("*, clients(id,full_name,phone,whatsapp_phone)")
    .eq("workshop_id", workshop.id)
    .order("updated_at", { ascending: false });

  if (query) {
    vehiclesQuery = vehiclesQuery.or(
      [
        `vehicle_label.ilike.%${query}%`,
        `plate.ilike.%${query}%`,
        `make.ilike.%${query}%`,
        `model.ilike.%${query}%`,
        `vin.ilike.%${query}%`,
      ].join(","),
    );
  }

  const { data, error } = await vehiclesQuery;

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  const vehicles = (((data as Array<
    VehicleRecord & { clients: ClientLite | ClientLite[] | null }
  > | null) ?? []).map((vehicle) => ({
    ...vehicle,
    owner: Array.isArray(vehicle.clients) ? vehicle.clients[0] ?? null : vehicle.clients,
  }))) as Array<VehicleRecord & { owner: ClientLite | null }>;

  if (!vehicles.length) {
    return [];
  }

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);

  const [quotesResult, workOrdersResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,vehicle_id")
      .eq("workshop_id", workshop.id)
      .in("vehicle_id", vehicleIds),
    supabase
      .from("work_orders")
      .select("id,vehicle_id")
      .eq("workshop_id", workshop.id)
      .in("vehicle_id", vehicleIds),
  ]);

  const nonMissingError = [quotesResult.error, workOrdersResult.error].find(
    (resultError) => resultError && !isMissingRelationError(resultError),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const quoteCounts = (((quotesResult.data as Array<{ vehicle_id: string | null }> | null) ?? []).reduce<
    Record<string, number>
  >((acc, quote) => {
    if (quote.vehicle_id) {
      acc[quote.vehicle_id] = (acc[quote.vehicle_id] ?? 0) + 1;
    }
    return acc;
  }, {}));

  const workOrderCounts = (((workOrdersResult.data as Array<{ vehicle_id: string | null }> | null) ?? []).reduce<
    Record<string, number>
  >((acc, order) => {
    if (order.vehicle_id) {
      acc[order.vehicle_id] = (acc[order.vehicle_id] ?? 0) + 1;
    }
    return acc;
  }, {}));

  return vehicles.map((vehicle) => ({
    ...vehicle,
    quoteCount: quoteCounts[vehicle.id] ?? 0,
    workOrderCount: workOrderCounts[vehicle.id] ?? 0,
  }));
}

export async function getVehicleDetail(vehicleId: string): Promise<VehicleDetailData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data: vehicleData, error: vehicleError } = await supabase
    .from("vehicles")
    .select("*, clients(id,full_name,phone,whatsapp_phone)")
    .eq("workshop_id", workshop.id)
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError) {
    if (isMissingRelationError(vehicleError)) {
      notFound();
    }

    throw vehicleError;
  }

  const vehicleRow = vehicleData as (VehicleRecord & { clients: ClientLite | ClientLite[] | null }) | null;

  if (!vehicleRow) {
    notFound();
  }

  const [quotesResult, workOrdersResult, photosResult, repairHistoryOrdersResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,vehicle_id,title,status,total_amount,created_at")
      .eq("workshop_id", workshop.id)
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("work_orders")
      .select("id,vehicle_id,title,status,total_amount,updated_at")
      .eq("workshop_id", workshop.id)
      .eq("vehicle_id", vehicleId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("vehicle_photos")
      .select("*")
      .eq("workshop_id", workshop.id)
      .eq("vehicle_id", vehicleId)
      .order("sort_order"),
    supabase
      .from("work_orders")
      .select("id,vehicle_id,code,title,status,total_amount,notes,assigned_mechanic_name,created_at,updated_at,completed_at")
      .eq("workshop_id", workshop.id)
      .eq("vehicle_id", vehicleId)
      .eq("status", "completada")
      .order("completed_at", { ascending: false }),
  ]);

  const nonMissingError = [quotesResult.error, workOrdersResult.error, photosResult.error, repairHistoryOrdersResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const repairHistoryOrders = ((repairHistoryOrdersResult.data as CompletedWorkOrderHistoryRow[] | null) ?? []).map(
    (order) => ({
      ...order,
      total_amount: Number(order.total_amount ?? 0),
    }),
  );

  let repairHistory: VehicleRepairHistoryEntry[] = [];

  if (repairHistoryOrders.length) {
    const workOrderIds = repairHistoryOrders.map((order) => order.id);

    const [servicesResult, partsResult, paymentsResult] = await Promise.all([
      supabase
        .from("work_order_services")
        .select("work_order_id,description,quantity,unit_price,line_total,sort_order")
        .eq("workshop_id", workshop.id)
        .in("work_order_id", workOrderIds)
        .order("sort_order"),
      supabase
        .from("work_order_parts")
        .select("work_order_id,description,quantity,unit_price,line_total,sort_order")
        .eq("workshop_id", workshop.id)
        .in("work_order_id", workOrderIds)
        .order("sort_order"),
      supabase
        .from("payments")
        .select("work_order_id,amount,status,paid_at")
        .eq("workshop_id", workshop.id)
        .in("work_order_id", workOrderIds)
        .order("paid_at", { ascending: false }),
    ]);

    const historyDetailError = [servicesResult.error, partsResult.error, paymentsResult.error].find(
      (error) => error && !isMissingRelationError(error),
    );

    if (historyDetailError) {
      throw historyDetailError;
    }

    const servicesByWorkOrder = (((servicesResult.data as WorkOrderHistoryItemRow[] | null) ?? []).reduce<
      Record<string, ReturnType<typeof normalizeHistoryItem>[]>
    >((acc, item) => {
      const normalized = normalizeHistoryItem(item);
      acc[item.work_order_id] = [...(acc[item.work_order_id] ?? []), normalized];
      return acc;
    }, {}));

    const partsByWorkOrder = (((partsResult.data as WorkOrderHistoryItemRow[] | null) ?? []).reduce<
      Record<string, ReturnType<typeof normalizeHistoryItem>[]>
    >((acc, item) => {
      const normalized = normalizeHistoryItem(item);
      acc[item.work_order_id] = [...(acc[item.work_order_id] ?? []), normalized];
      return acc;
    }, {}));

    const paymentsByWorkOrder = (((paymentsResult.data as PaymentHistorySummaryRow[] | null) ?? []).reduce<
      Record<string, PaymentHistorySummaryRow[]>
    >((acc, payment) => {
      if (!payment.work_order_id) {
        return acc;
      }

      acc[payment.work_order_id] = [...(acc[payment.work_order_id] ?? []), payment];
      return acc;
    }, {}));

    repairHistory = repairHistoryOrders.map((order) => {
      const payments = paymentsByWorkOrder[order.id] ?? [];
      const totalCollected = payments
        .filter((payment) => isCollectedPaymentStatus(payment.status))
        .reduce((total, payment) => total + Number(payment.amount ?? 0), 0);

      return {
        workOrder: order,
        services: servicesByWorkOrder[order.id] ?? [],
        parts: partsByWorkOrder[order.id] ?? [],
        paymentSummary: {
          totalCollected,
          paymentCount: payments.length,
          pendingBalance: Math.max(Number((order.total_amount - totalCollected).toFixed(2)), 0),
          latestPaymentAt: payments[0]?.paid_at ?? null,
        },
      };
    });
  }

  return {
    vehicle: vehicleRow,
    owner: Array.isArray(vehicleRow.clients) ? vehicleRow.clients[0] ?? null : vehicleRow.clients,
    quotes: (quotesResult.data as QuoteLiteRow[] | null) ?? [],
    workOrders: (workOrdersResult.data as WorkOrderLiteRow[] | null) ?? [],
    photos: (photosResult.data as VehiclePhotoRecord[] | null) ?? [],
    repairHistory,
  };
}

export async function getVehicleForEdit(vehicleId: string) {
  return getVehicleDetail(vehicleId);
}

export async function upsertVehicle(input: VehicleProfileInput, vehicleId?: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const payload = {
    workshop_id: workshop.id,
    client_id: input.clientId,
    vehicle_label: buildVehicleLabel(input),
    plate: input.plate,
    make: input.make,
    model: input.model,
    vehicle_year: input.year,
    color: input.color || null,
    mileage: input.mileage ?? null,
    vin: input.vin || null,
    notes: input.notes || null,
  };

  const query = vehicleId
    ? supabase.from("vehicles").update(payload).eq("id", vehicleId).eq("workshop_id", workshop.id)
    : supabase.from("vehicles").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  const vehicle = data as VehicleRecord;
  await replaceVehiclePhotos(vehicle.id, workshop.id, input.photoUrls);

  return vehicle;
}

export function getVehicleDetailHref(vehicleId: string) {
  return `/app/vehicles/${vehicleId}` as Route;
}

export function getVehicleEditHref(vehicleId: string) {
  return `/app/vehicles/${vehicleId}/edit` as Route;
}

export async function requireVehicleOrRedirect(vehicleId: string) {
  try {
    return await getVehicleDetail(vehicleId);
  } catch {
    redirect("/app/vehicles" as Route);
  }
}
