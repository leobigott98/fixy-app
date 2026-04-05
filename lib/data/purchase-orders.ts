import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { getInventoryPartOptions } from "@/lib/data/inventory";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { getPurchaseOrderStatusLabel } from "@/lib/purchase-orders/constants";
import {
  normalizePurchaseOrderInput,
  type PurchaseOrderFormValues,
  type PurchaseOrderInput,
  type PurchaseOrderItemInput,
} from "@/lib/purchase-orders/schema";

type SupplierLite = {
  id: string;
  name: string;
  phone: string | null;
};

export type PurchaseOrderRecord = {
  id: string;
  workshop_id: string;
  supplier_id: string | null;
  code: string | null;
  status: "draft" | "sent" | "received" | "cancelled";
  ordered_at: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderItemRecord = {
  id: string;
  purchase_order_id: string;
  workshop_id: string;
  inventory_item_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  sort_order: number;
  created_at: string;
};

type PurchaseOrderRowWithRelations = Omit<PurchaseOrderRecord, "total_amount"> & {
  total_amount: number | string | null;
  suppliers: SupplierLite | SupplierLite[] | null;
};

export type PurchaseOrderListItem = PurchaseOrderRecord & {
  supplier: SupplierLite | null;
  itemCount: number;
};

export type PurchaseOrderDetailData = {
  purchaseOrder: PurchaseOrderRecord;
  supplier: SupplierLite | null;
  items: PurchaseOrderItemRecord[];
};

export type PurchaseOrderFormOptions = {
  suppliers: Array<{
    id: string;
    label: string;
  }>;
  inventoryItems: Array<{
    id: string;
    label: string;
    name: string;
    cost: number;
  }>;
};

function toSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildPurchaseOrderCode() {
  return `OC-${Date.now().toString().slice(-6)}`;
}

function normalizePurchaseOrderRecord(record: Omit<PurchaseOrderRecord, "total_amount"> & {
  total_amount: number | string | null;
}) {
  return {
    ...record,
    total_amount: Number(record.total_amount ?? 0),
  };
}

function normalizePurchaseOrderItemRecord(
  item: Omit<PurchaseOrderItemRecord, "quantity" | "unit_cost" | "line_total"> & {
    quantity: number | string | null;
    unit_cost: number | string | null;
    line_total: number | string | null;
  },
) {
  return {
    ...item,
    quantity: Number(item.quantity ?? 0),
    unit_cost: Number(item.unit_cost ?? 0),
    line_total: Number(item.line_total ?? 0),
  };
}

function formatPurchaseOrderItemsForInsert(
  purchaseOrderId: string,
  workshopId: string,
  items: PurchaseOrderItemInput[],
) {
  return items.map((item) => ({
    purchase_order_id: purchaseOrderId,
    workshop_id: workshopId,
    inventory_item_id: item.inventoryItemId ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_cost: item.unitCost,
    line_total: item.lineTotal,
    sort_order: item.sortOrder,
  }));
}

async function validatePurchaseOrderRelations(input: PurchaseOrderInput) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("workshop_id", workshop.id)
    .eq("id", input.supplierId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Selecciona un proveedor valido.");
  }

  return { workshop };
}

export async function getPurchaseOrderFormOptions(): Promise<PurchaseOrderFormOptions> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const [suppliersResult, inventoryItems] = await Promise.all([
    supabase.from("suppliers").select("id,name").eq("workshop_id", workshop.id).order("name"),
    getInventoryPartOptions(),
  ]);

  if (suppliersResult.error && !isMissingRelationError(suppliersResult.error)) {
    throw suppliersResult.error;
  }

  return {
    suppliers: (((suppliersResult.data as Array<{ id: string; name: string }> | null) ?? []).map((supplier) => ({
      id: supplier.id,
      label: supplier.name,
    }))),
    inventoryItems: inventoryItems.map((item) => ({
      id: item.id,
      label: item.label,
      name: item.name,
      cost: item.cost,
    })),
  };
}

export async function getPurchaseOrdersList(search?: string): Promise<PurchaseOrderListItem[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const query = search?.trim().toLowerCase() ?? "";

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(id,name,phone)")
    .eq("workshop_id", workshop.id)
    .order("ordered_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  const rows = ((data as PurchaseOrderRowWithRelations[] | null) ?? [])
    .map((row) => ({
      ...normalizePurchaseOrderRecord(row),
      supplier: toSingleRelation(row.suppliers),
    }))
    .filter((order) => {
      if (!query) {
        return true;
      }

      const haystack = [
        order.code ?? "",
        order.supplier?.name ?? "",
        getPurchaseOrderStatusLabel(order.status),
        order.notes ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

  if (!rows.length) {
    return [];
  }

  const orderIds = rows.map((order) => order.id);
  const { data: itemsData, error: itemsError } = await supabase
    .from("purchase_order_items")
    .select("purchase_order_id")
    .eq("workshop_id", workshop.id)
    .in("purchase_order_id", orderIds);

  if (itemsError && !isMissingRelationError(itemsError)) {
    throw itemsError;
  }

  const itemCounts = (((itemsData as Array<{ purchase_order_id: string }> | null) ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      acc[item.purchase_order_id] = (acc[item.purchase_order_id] ?? 0) + 1;
      return acc;
    },
    {},
  ));

  return rows.map((order) => ({
    ...order,
    itemCount: itemCounts[order.id] ?? 0,
  }));
}

export async function getPurchaseOrderDetail(purchaseOrderId: string): Promise<PurchaseOrderDetailData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data: orderData, error: orderError } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(id,name,phone)")
    .eq("workshop_id", workshop.id)
    .eq("id", purchaseOrderId)
    .maybeSingle();

  if (orderError) {
    if (isMissingRelationError(orderError)) {
      notFound();
    }

    throw orderError;
  }

  const order = orderData as PurchaseOrderRowWithRelations | null;

  if (!order) {
    notFound();
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("purchase_order_items")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("purchase_order_id", purchaseOrderId)
    .order("sort_order");

  if (itemsError && !isMissingRelationError(itemsError)) {
    throw itemsError;
  }

  return {
    purchaseOrder: normalizePurchaseOrderRecord(order),
    supplier: toSingleRelation(order.suppliers),
    items: ((itemsData as Array<
      Omit<PurchaseOrderItemRecord, "quantity" | "unit_cost" | "line_total"> & {
        quantity: number | string | null;
        unit_cost: number | string | null;
        line_total: number | string | null;
      }
    > | null) ?? []).map(normalizePurchaseOrderItemRecord),
  };
}

export async function getPurchaseOrderForEdit(purchaseOrderId: string) {
  return getPurchaseOrderDetail(purchaseOrderId);
}

export async function upsertPurchaseOrder(values: PurchaseOrderFormValues, purchaseOrderId?: string) {
  const input = normalizePurchaseOrderInput(values);
  const { workshop } = await validatePurchaseOrderRelations(input);
  const supabase = await createSupabaseDataClient();

  let existingCode: string | null = null;

  if (purchaseOrderId) {
    const { data } = await supabase
      .from("purchase_orders")
      .select("code")
      .eq("workshop_id", workshop.id)
      .eq("id", purchaseOrderId)
      .maybeSingle();

    existingCode = (data as { code: string | null } | null)?.code ?? null;
  }

  const payload = {
    workshop_id: workshop.id,
    supplier_id: input.supplierId,
    code: existingCode ?? buildPurchaseOrderCode(),
    status: input.status,
    ordered_at: input.date,
    total_amount: input.total,
    notes: input.notes || null,
  };

  const query = purchaseOrderId
    ? supabase.from("purchase_orders").update(payload).eq("workshop_id", workshop.id).eq("id", purchaseOrderId)
    : supabase.from("purchase_orders").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  const purchaseOrder = normalizePurchaseOrderRecord(data as Omit<PurchaseOrderRecord, "total_amount"> & {
    total_amount: number | string | null;
  });

  if (purchaseOrderId) {
    const { error: deleteError } = await supabase
      .from("purchase_order_items")
      .delete()
      .eq("purchase_order_id", purchaseOrderId)
      .eq("workshop_id", workshop.id);

    if (deleteError && !isMissingRelationError(deleteError)) {
      throw deleteError;
    }
  }

  const itemsPayload = formatPurchaseOrderItemsForInsert(purchaseOrder.id, workshop.id, input.items);

  if (itemsPayload.length) {
    const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsPayload);

    if (itemsError) {
      throw itemsError;
    }
  }

  return purchaseOrder;
}

export function getPurchaseOrderEditHref(purchaseOrderId: string) {
  return `/app/purchase-orders/${purchaseOrderId}/edit` as Route;
}

export async function requirePurchaseOrderOrRedirect(purchaseOrderId: string) {
  try {
    return await getPurchaseOrderDetail(purchaseOrderId);
  } catch {
    redirect("/app/purchase-orders" as Route);
  }
}
