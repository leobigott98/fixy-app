import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { getInventoryPartOptions } from "@/lib/data/inventory";
import { requireWorkshopOperation } from "@/lib/data/workshops";
import { getPurchaseOrderStatusLabel } from "@/lib/purchase-orders/constants";
import {
  normalizePurchaseOrderInput,
  type PurchaseOrderFormValues,
  type PurchaseOrderInput,
  type PurchaseOrderItemInput,
} from "@/lib/purchase-orders/schema";

type SupplierLite = {
  id: string;
  workshop_id: string;
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

export type PurchaseOrderInputErrorCode =
  | "supplier_not_available"
  | "purchase_order_not_available"
  | "inventory_items_not_available";

export class PurchaseOrderInputError extends Error {
  readonly code: PurchaseOrderInputErrorCode;

  constructor(code: PurchaseOrderInputErrorCode) {
    const messages: Record<PurchaseOrderInputErrorCode, string> = {
      supplier_not_available: "El proveedor seleccionado no esta disponible.",
      purchase_order_not_available: "La orden de compra seleccionada no esta disponible.",
      inventory_items_not_available: "Uno o mas repuestos no estan disponibles.",
    };

    super(messages[code]);
    this.name = "PurchaseOrderInputError";
    this.code = code;
  }
}

class PurchaseOrderDataError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause });
    this.name = "PurchaseOrderDataError";
  }
}

function toSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toWorkshopRelation<T extends { workshop_id: string }>(
  value: T | T[] | null,
  workshopId: string,
): T | null {
  const relation = toSingleRelation(value);
  return relation?.workshop_id === workshopId ? relation : null;
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

async function validatePurchaseOrderRelations(input: PurchaseOrderInput, workshopId: string) {
  const supabase = await createSupabaseDataClient();

  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("id")
    .eq("workshop_id", workshopId)
    .eq("id", input.supplierId)
    .maybeSingle();

  if (supplierError) {
    throw new PurchaseOrderDataError("No se pudo validar el proveedor.", supplierError);
  }

  if (!supplier) {
    throw new PurchaseOrderInputError("supplier_not_available");
  }

  const inventoryItemIds = [...new Set(
    input.items
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
      throw new PurchaseOrderDataError("No se pudieron validar los repuestos.", inventoryItemsError);
    }

    const availableItemIds = new Set(
      ((inventoryItems as Array<{ id: string }> | null) ?? []).map((item) => item.id),
    );

    if (inventoryItemIds.some((itemId) => !availableItemIds.has(itemId))) {
      throw new PurchaseOrderInputError("inventory_items_not_available");
    }
  }

  return supabase;
}

export async function getPurchaseOrderFormOptions(): Promise<PurchaseOrderFormOptions> {
  const { workshop } = await requireWorkshopOperation("purchase_orders.view");
  const supabase = await createSupabaseDataClient();

  const [suppliersResult, inventoryItems] = await Promise.all([
    supabase.from("suppliers").select("id,name").eq("workshop_id", workshop.id).order("name"),
    getInventoryPartOptions(),
  ]);

  if (suppliersResult.error && !isMissingRelationError(suppliersResult.error)) {
    throw new PurchaseOrderDataError("No se pudieron cargar las opciones de compra.", suppliersResult.error);
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
  const { workshop } = await requireWorkshopOperation("purchase_orders.view");
  const supabase = await createSupabaseDataClient();
  const query = search?.trim().toLowerCase() ?? "";

  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(id,workshop_id,name,phone)")
    .eq("workshop_id", workshop.id)
    .order("ordered_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw new PurchaseOrderDataError("No se pudieron cargar las ordenes de compra.", error);
  }

  const rows = ((data as PurchaseOrderRowWithRelations[] | null) ?? [])
    .map((row) => ({
      ...normalizePurchaseOrderRecord(row),
      supplier: toWorkshopRelation(row.suppliers, workshop.id),
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
    throw new PurchaseOrderDataError("No se pudo cargar el detalle de las ordenes de compra.", itemsError);
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
  const { workshop } = await requireWorkshopOperation("purchase_orders.view");
  const supabase = await createSupabaseDataClient();

  const { data: orderData, error: orderError } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(id,workshop_id,name,phone)")
    .eq("workshop_id", workshop.id)
    .eq("id", purchaseOrderId)
    .maybeSingle();

  if (orderError) {
    if (isMissingRelationError(orderError)) {
      notFound();
    }

    throw new PurchaseOrderDataError("No se pudo cargar la orden de compra.", orderError);
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
    throw new PurchaseOrderDataError("No se pudieron cargar los items de la orden de compra.", itemsError);
  }

  return {
    purchaseOrder: normalizePurchaseOrderRecord(order),
    supplier: toWorkshopRelation(order.suppliers, workshop.id),
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
  const { workshop } = await requireWorkshopOperation("purchase_orders.manage");
  const input = normalizePurchaseOrderInput(values);
  const supabase = await validatePurchaseOrderRelations(input, workshop.id);

  let existingCode: string | null = null;

  if (purchaseOrderId) {
    const { data: existingPurchaseOrder, error: existingPurchaseOrderError } = await supabase
      .from("purchase_orders")
      .select("code")
      .eq("workshop_id", workshop.id)
      .eq("id", purchaseOrderId)
      .maybeSingle();

    if (existingPurchaseOrderError) {
      throw new PurchaseOrderDataError("No se pudo validar la orden de compra.", existingPurchaseOrderError);
    }

    if (!existingPurchaseOrder) {
      throw new PurchaseOrderInputError("purchase_order_not_available");
    }

    existingCode = (existingPurchaseOrder as { code: string | null }).code;
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
    throw new PurchaseOrderDataError("No se pudo guardar la orden de compra.", error);
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
      throw new PurchaseOrderDataError("No se pudieron actualizar los items de la orden de compra.", deleteError);
    }
  }

  const itemsPayload = formatPurchaseOrderItemsForInsert(purchaseOrder.id, workshop.id, input.items);

  if (itemsPayload.length) {
    const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsPayload);

    if (itemsError) {
      throw new PurchaseOrderDataError("No se pudieron guardar los items de la orden de compra.", itemsError);
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
