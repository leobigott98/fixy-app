import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { isCollectedPaymentStatus } from "@/lib/finances/constants";
import type { ClientProfileInput } from "@/lib/clients/schema";

export type ClientRecord = {
  id: string;
  workshop_id: string;
  full_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type VehicleLiteRow = {
  id: string;
  client_id: string | null;
  vehicle_label: string | null;
  plate: string | null;
  make: string | null;
  model: string | null;
  vehicle_year: number | null;
  color: string | null;
  mileage: number | null;
};

type QuoteLiteRow = {
  id: string;
  client_id: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  created_at: string;
};

type WorkOrderLiteRow = {
  id: string;
  client_id: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  updated_at: string;
};

type PaymentLiteRow = {
  amount: number | string | null;
  status: string | null;
};

export type ClientListItem = ClientRecord & {
  vehicleCount: number;
  vehicles: Array<{
    id: string;
    label: string;
  }>;
  quoteCount: number;
  workOrderCount: number;
};

export type ClientDetailData = {
  client: ClientRecord;
  vehicles: VehicleLiteRow[];
  quotes: QuoteLiteRow[];
  workOrders: WorkOrderLiteRow[];
  paymentSummary: {
    totalCollected: number;
    paymentCount: number;
  };
};

function normalizeSearchQuery(query?: string) {
  return query?.trim() ?? "";
}

export async function getClientsList(search?: string): Promise<ClientListItem[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const query = normalizeSearchQuery(search);

  let clientsQuery = supabase
    .from("clients")
    .select("*")
    .eq("workshop_id", workshop.id)
    .order("updated_at", { ascending: false });

  if (query) {
    clientsQuery = clientsQuery.or(
      [
        `full_name.ilike.%${query}%`,
        `phone.ilike.%${query}%`,
        `whatsapp_phone.ilike.%${query}%`,
        `email.ilike.%${query}%`,
      ].join(","),
    );
  }

  const { data: clientsData, error: clientsError } = await clientsQuery;

  if (clientsError) {
    if (isMissingRelationError(clientsError)) {
      return [];
    }

    throw clientsError;
  }

  const clients = (clientsData as ClientRecord[] | null) ?? [];

  if (!clients.length) {
    return [];
  }

  const clientIds = clients.map((client) => client.id);

  const [vehiclesResult, quotesResult, workOrdersResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id,client_id,vehicle_label,plate,make,model,vehicle_year,color,mileage")
      .eq("workshop_id", workshop.id)
      .in("client_id", clientIds),
    supabase
      .from("quotes")
      .select("id,client_id")
      .eq("workshop_id", workshop.id)
      .in("client_id", clientIds),
    supabase
      .from("work_orders")
      .select("id,client_id")
      .eq("workshop_id", workshop.id)
      .in("client_id", clientIds),
  ]);

  const nonMissingError = [vehiclesResult.error, quotesResult.error, workOrdersResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const vehicles = ((vehiclesResult.data as VehicleLiteRow[] | null) ?? []).reduce<
    Record<string, VehicleLiteRow[]>
  >((acc, vehicle) => {
    if (!vehicle.client_id) {
      return acc;
    }

    acc[vehicle.client_id] ??= [];
    acc[vehicle.client_id].push(vehicle);
    return acc;
  }, {});

  const quoteCounts = (((quotesResult.data as Array<{ client_id: string | null }> | null) ?? []).reduce<
    Record<string, number>
  >((acc, quote) => {
    if (quote.client_id) {
      acc[quote.client_id] = (acc[quote.client_id] ?? 0) + 1;
    }
    return acc;
  }, {}));

  const workOrderCounts = (((workOrdersResult.data as Array<{ client_id: string | null }> | null) ?? []).reduce<
    Record<string, number>
  >((acc, order) => {
    if (order.client_id) {
      acc[order.client_id] = (acc[order.client_id] ?? 0) + 1;
    }
    return acc;
  }, {}));

  return clients.map((client) => {
    const linkedVehicles = vehicles[client.id] ?? [];

    return {
      ...client,
      vehicleCount: linkedVehicles.length,
      vehicles: linkedVehicles.slice(0, 3).map((vehicle) => ({
        id: vehicle.id,
        label:
          vehicle.vehicle_label ??
          [vehicle.make, vehicle.model, vehicle.plate].filter(Boolean).join(" "),
      })),
      quoteCount: quoteCounts[client.id] ?? 0,
      workOrderCount: workOrderCounts[client.id] ?? 0,
    };
  });
}

export async function getClientDetail(clientId: string): Promise<ClientDetailData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    if (isMissingRelationError(clientError)) {
      notFound();
    }

    throw clientError;
  }

  const client = clientData as ClientRecord | null;

  if (!client) {
    notFound();
  }

  const [vehiclesResult, quotesResult, workOrdersResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id,client_id,vehicle_label,plate,make,model,vehicle_year,color,mileage")
      .eq("workshop_id", workshop.id)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id,client_id,title,status,total_amount,created_at")
      .eq("workshop_id", workshop.id)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("work_orders")
      .select("id,client_id,title,status,total_amount,updated_at")
      .eq("workshop_id", workshop.id)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const nonMissingError = [vehiclesResult.error, quotesResult.error, workOrdersResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const workOrders = (workOrdersResult.data as WorkOrderLiteRow[] | null) ?? [];
  const quoteRows = (quotesResult.data as QuoteLiteRow[] | null) ?? [];

  let paymentSummary = {
    totalCollected: 0,
    paymentCount: 0,
  };

  if (quoteRows.length || workOrders.length || clientId) {
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("amount,status")
      .eq("workshop_id", workshop.id)
      .or(
        [
          `client_id.eq.${clientId}`,
          quoteRows.length ? `quote_id.in.(${quoteRows.map((quote) => quote.id).join(",")})` : "",
          workOrders.length
            ? `work_order_id.in.(${workOrders.map((order) => order.id).join(",")})`
            : "",
        ]
          .filter(Boolean)
          .join(","),
      );

    if (paymentsError && !isMissingRelationError(paymentsError)) {
      throw paymentsError;
    }

    const payments = (paymentsData as PaymentLiteRow[] | null) ?? [];
    paymentSummary = {
      paymentCount: payments.length,
      totalCollected: payments
        .filter((payment) => isCollectedPaymentStatus(payment.status))
        .reduce((total, payment) => total + Number(payment.amount ?? 0), 0),
    };
  }

  return {
    client,
    vehicles: (vehiclesResult.data as VehicleLiteRow[] | null) ?? [],
    quotes: quoteRows,
    workOrders,
    paymentSummary,
  };
}

export async function getClientForEdit(clientId: string) {
  const detail = await getClientDetail(clientId);

  return detail.client;
}

export async function upsertClient(input: ClientProfileInput, clientId?: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const payload = {
    workshop_id: workshop.id,
    full_name: input.fullName,
    phone: input.phone || null,
    whatsapp_phone: input.whatsappPhone || null,
    email: input.email || null,
    notes: input.notes || null,
  };

  const query = clientId
    ? supabase.from("clients").update(payload).eq("id", clientId).eq("workshop_id", workshop.id)
    : supabase.from("clients").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  return data as ClientRecord;
}

export function getClientDetailHref(clientId: string) {
  return `/app/clients/${clientId}` as Route;
}

export function getClientEditHref(clientId: string) {
  return `/app/clients/${clientId}/edit` as Route;
}

export async function requireClientOrRedirect(clientId: string) {
  try {
    return await getClientDetail(clientId);
  } catch {
    redirect("/app/clients" as Route);
  }
}
