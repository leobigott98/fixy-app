import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { getMechanicRoleLabel } from "@/lib/mechanics/constants";
import type { MechanicProfileValues } from "@/lib/mechanics/schema";

export type MechanicRecord = {
  id: string;
  workshop_id: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

type WorkOrderLite = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  promised_date: string | null;
  vehicle_label: string | null;
};

export type MechanicListItem = MechanicRecord & {
  assignedActiveOrders: number;
  assignedCompletedOrders: number;
  currentOrders: WorkOrderLite[];
};

export type MechanicDetailData = {
  mechanic: MechanicRecord;
  assignedActiveOrders: WorkOrderLite[];
  assignedCompletedOrders: WorkOrderLite[];
};

function normalizeSearchQuery(search?: string) {
  return search?.trim() ?? "";
}

function normalizeWorkOrderLite(row: WorkOrderLite) {
  return {
    ...row,
    total_amount: Number(row.total_amount ?? 0),
  };
}

function splitWorkOrdersByStatus(workOrders: WorkOrderLite[]) {
  return {
    active: workOrders.filter((workOrder) => !["completada", "cancelada"].includes(workOrder.status)),
    completed: workOrders.filter((workOrder) => workOrder.status === "completada"),
  };
}

export async function getMechanicsList(search?: string): Promise<MechanicListItem[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const query = normalizeSearchQuery(search);

  let mechanicsQuery = supabase
    .from("mechanics")
    .select("*")
    .eq("workshop_id", workshop.id)
    .order("is_active", { ascending: false })
    .order("full_name", { ascending: true });

  if (query) {
    mechanicsQuery = mechanicsQuery.or(
      [`full_name.ilike.%${query}%`, `phone.ilike.%${query}%`, `role.ilike.%${query}%`].join(","),
    );
  }

  const { data, error } = await mechanicsQuery;

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  const mechanics = (data as MechanicRecord[] | null) ?? [];

  if (!mechanics.length) {
    return [];
  }

  const mechanicIds = mechanics.map((mechanic) => mechanic.id);
  const { data: workOrdersData, error: workOrdersError } = await supabase
    .from("work_orders")
    .select("id,code,title,status,total_amount,promised_date,vehicle_label,assigned_mechanic_id")
    .eq("workshop_id", workshop.id)
    .in("assigned_mechanic_id", mechanicIds)
    .order("updated_at", { ascending: false });

  if (workOrdersError && !isMissingRelationError(workOrdersError)) {
    throw workOrdersError;
  }

  const groupedWorkOrders = (((workOrdersData as Array<
    WorkOrderLite & { assigned_mechanic_id: string | null }
  > | null) ?? []).reduce<Record<string, WorkOrderLite[]>>((acc, workOrder) => {
    if (!workOrder.assigned_mechanic_id) {
      return acc;
    }

    acc[workOrder.assigned_mechanic_id] ??= [];
    acc[workOrder.assigned_mechanic_id].push(normalizeWorkOrderLite(workOrder));
    return acc;
  }, {}));

  return mechanics.map((mechanic) => {
    const assignedOrders = groupedWorkOrders[mechanic.id] ?? [];
    const split = splitWorkOrdersByStatus(assignedOrders);

    return {
      ...mechanic,
      assignedActiveOrders: split.active.length,
      assignedCompletedOrders: split.completed.length,
      currentOrders: split.active.slice(0, 3),
    };
  });
}

export async function getMechanicDetail(mechanicId: string): Promise<MechanicDetailData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data: mechanicData, error: mechanicError } = await supabase
    .from("mechanics")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("id", mechanicId)
    .maybeSingle();

  if (mechanicError) {
    if (isMissingRelationError(mechanicError)) {
      notFound();
    }

    throw mechanicError;
  }

  const mechanic = mechanicData as MechanicRecord | null;

  if (!mechanic) {
    notFound();
  }

  const { data: workOrdersData, error: workOrdersError } = await supabase
    .from("work_orders")
    .select("id,code,title,status,total_amount,promised_date,vehicle_label")
    .eq("workshop_id", workshop.id)
    .eq("assigned_mechanic_id", mechanicId)
    .order("updated_at", { ascending: false });

  if (workOrdersError && !isMissingRelationError(workOrdersError)) {
    throw workOrdersError;
  }

  const workOrders = (((workOrdersData as WorkOrderLite[] | null) ?? []).map((workOrder) =>
    normalizeWorkOrderLite(workOrder),
  ));
  const split = splitWorkOrdersByStatus(workOrders);

  return {
    mechanic,
    assignedActiveOrders: split.active,
    assignedCompletedOrders: split.completed,
  };
}

export async function getMechanicForEdit(mechanicId: string) {
  const detail = await getMechanicDetail(mechanicId);
  return detail.mechanic;
}

export async function upsertMechanic(values: MechanicProfileValues, mechanicId?: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const payload = {
    workshop_id: workshop.id,
    full_name: values.fullName,
    phone: values.phone || null,
    role: values.role,
    is_active: values.isActive,
    notes: values.notes || null,
    photo_url: values.photoUrl || null,
  };

  const query = mechanicId
    ? supabase.from("mechanics").update(payload).eq("id", mechanicId).eq("workshop_id", workshop.id)
    : supabase.from("mechanics").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  return data as MechanicRecord;
}

export async function getMechanicAssignmentOptions() {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const { data, error } = await supabase
    .from("mechanics")
    .select("id,full_name,role,is_active")
    .eq("workshop_id", workshop.id)
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (((data as Array<{
    id: string;
    full_name: string;
    role: string;
    is_active: boolean;
  }> | null) ?? []).map((mechanic) => ({
    id: mechanic.id,
    label: `${mechanic.full_name} · ${getMechanicRoleLabel(mechanic.role)}`,
    fullName: mechanic.full_name,
  })));
}

export function getMechanicDetailHref(mechanicId: string) {
  return `/app/mechanics/${mechanicId}` as Route;
}

export function getMechanicEditHref(mechanicId: string) {
  return `/app/mechanics/${mechanicId}/edit` as Route;
}

export async function requireMechanicOrRedirect(mechanicId: string) {
  try {
    return await getMechanicDetail(mechanicId);
  } catch {
    redirect("/app/mechanics" as Route);
  }
}
