import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import {
  normalizeInventoryItemInput,
  type InventoryItemFormValues,
} from "@/lib/inventory/schema";

export type InventoryItemRecord = {
  id: string;
  workshop_id: string;
  name: string;
  description: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  cost: number;
  reference_sale_price: number;
  sku: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryMovementRecord = {
  id: string;
  workshop_id: string;
  inventory_item_id: string;
  movement_type: "initial_stock" | "manual_adjustment" | "work_order_usage";
  quantity_delta: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
};

export type InventoryListItem = InventoryItemRecord & {
  quoteUsageCount: number;
  workOrderUsageCount: number;
  lowStock: boolean;
};

export type InventoryPartOption = {
  id: string;
  name: string;
  label: string;
  sku: string | null;
  stockQuantity: number;
  cost: number;
  referenceSalePrice: number;
};

function normalizeInventoryItemRecord(record: Omit<InventoryItemRecord, "stock_quantity" | "low_stock_threshold" | "cost" | "reference_sale_price"> & {
  stock_quantity: number | string | null;
  low_stock_threshold: number | string | null;
  cost: number | string | null;
  reference_sale_price: number | string | null;
}) {
  return {
    ...record,
    stock_quantity: Number(record.stock_quantity ?? 0),
    low_stock_threshold: Number(record.low_stock_threshold ?? 0),
    cost: Number(record.cost ?? 0),
    reference_sale_price: Number(record.reference_sale_price ?? 0),
  };
}

export function isLowStockItem(item: Pick<InventoryItemRecord, "stock_quantity" | "low_stock_threshold">) {
  return item.stock_quantity <= item.low_stock_threshold;
}

function buildInventoryOptionLabel(item: Pick<InventoryItemRecord, "name" | "sku" | "stock_quantity">) {
  return [item.name, item.sku ? `SKU ${item.sku}` : null, `Stock ${item.stock_quantity}`]
    .filter(Boolean)
    .join(" · ");
}

async function insertInventoryMovement(
  workshopId: string,
  movement: {
    inventoryItemId: string;
    movementType: InventoryMovementRecord["movement_type"];
    quantityDelta: number;
    referenceType?: string | null;
    referenceId?: string | null;
    note?: string | null;
  },
) {
  const supabase = await createSupabaseDataClient();
  const { error } = await supabase.from("inventory_movements").insert({
    workshop_id: workshopId,
    inventory_item_id: movement.inventoryItemId,
    movement_type: movement.movementType,
    quantity_delta: movement.quantityDelta,
    reference_type: movement.referenceType ?? null,
    reference_id: movement.referenceId ?? null,
    note: movement.note ?? null,
  });

  if (error) {
    throw error;
  }
}

async function updateInventoryQuantities(
  workshopId: string,
  deltas: Record<string, number>,
) {
  const supabase = await createSupabaseDataClient();
  const itemIds = Object.keys(deltas).filter((itemId) => deltas[itemId] !== 0);

  if (!itemIds.length) {
    return;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("id,stock_quantity")
    .eq("workshop_id", workshopId)
    .in("id", itemIds);

  if (error) {
    throw error;
  }

  const currentRows = ((data as Array<{ id: string; stock_quantity: number | string | null }> | null) ?? []).reduce<
    Record<string, number>
  >((acc, item) => {
    acc[item.id] = Number(item.stock_quantity ?? 0);
    return acc;
  }, {});

  for (const itemId of itemIds) {
    const nextQuantity = Number(((currentRows[itemId] ?? 0) + deltas[itemId]).toFixed(2));
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        stock_quantity: nextQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("workshop_id", workshopId)
      .eq("id", itemId);

    if (updateError) {
      throw updateError;
    }
  }
}

export async function getInventoryPartOptions(): Promise<InventoryPartOption[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("inventory_items")
    .select("id,name,sku,stock_quantity,cost,reference_sale_price")
    .eq("workshop_id", workshop.id)
    .order("name", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  return (((data as Array<{
    id: string;
    name: string;
    sku: string | null;
    stock_quantity: number | string | null;
    cost: number | string | null;
    reference_sale_price: number | string | null;
  }> | null) ?? []).map((item) => {
    const normalized = {
      ...item,
      stock_quantity: Number(item.stock_quantity ?? 0),
      cost: Number(item.cost ?? 0),
      reference_sale_price: Number(item.reference_sale_price ?? 0),
    };

    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      stockQuantity: normalized.stock_quantity,
      cost: normalized.cost,
      referenceSalePrice: normalized.reference_sale_price,
      label: buildInventoryOptionLabel({
        name: item.name,
        sku: item.sku,
        stock_quantity: normalized.stock_quantity,
      }),
    };
  }));
}

export async function getInventoryList(search?: string): Promise<InventoryListItem[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const query = search?.trim() ?? "";

  let inventoryQuery = supabase
    .from("inventory_items")
    .select("*")
    .eq("workshop_id", workshop.id)
    .order("updated_at", { ascending: false });

  if (query) {
    inventoryQuery = inventoryQuery.or(
      [`name.ilike.%${query}%`, `description.ilike.%${query}%`, `sku.ilike.%${query}%`, `notes.ilike.%${query}%`].join(","),
    );
  }

  const { data, error } = await inventoryQuery;

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  const items = ((data as Array<
    Omit<InventoryItemRecord, "stock_quantity" | "low_stock_threshold" | "cost" | "reference_sale_price"> & {
      stock_quantity: number | string | null;
      low_stock_threshold: number | string | null;
      cost: number | string | null;
      reference_sale_price: number | string | null;
    }
  > | null) ?? []).map(normalizeInventoryItemRecord);

  if (!items.length) {
    return [];
  }

  const itemIds = items.map((item) => item.id);
  const [quoteUsageResult, workOrderUsageResult] = await Promise.all([
    supabase
      .from("quote_items")
      .select("inventory_item_id")
      .eq("workshop_id", workshop.id)
      .in("inventory_item_id", itemIds),
    supabase
      .from("work_order_parts")
      .select("inventory_item_id")
      .eq("workshop_id", workshop.id)
      .in("inventory_item_id", itemIds),
  ]);

  const usageError = [quoteUsageResult.error, workOrderUsageResult.error].find(
    (resultError) => resultError && !isMissingRelationError(resultError),
  );

  if (usageError) {
    throw usageError;
  }

  const quoteUsageCounts = (((quoteUsageResult.data as Array<{ inventory_item_id: string | null }> | null) ?? []).reduce<
    Record<string, number>
  >((acc, item) => {
    if (item.inventory_item_id) {
      acc[item.inventory_item_id] = (acc[item.inventory_item_id] ?? 0) + 1;
    }
    return acc;
  }, {}));

  const workOrderUsageCounts = (((workOrderUsageResult.data as Array<{ inventory_item_id: string | null }> | null) ?? []).reduce<
    Record<string, number>
  >((acc, item) => {
    if (item.inventory_item_id) {
      acc[item.inventory_item_id] = (acc[item.inventory_item_id] ?? 0) + 1;
    }
    return acc;
  }, {}));

  return items.map((item) => ({
    ...item,
    quoteUsageCount: quoteUsageCounts[item.id] ?? 0,
    workOrderUsageCount: workOrderUsageCounts[item.id] ?? 0,
    lowStock: isLowStockItem(item),
  }));
}

export async function getInventoryItem(itemId: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      notFound();
    }

    throw error;
  }

  if (!data) {
    notFound();
  }

  return normalizeInventoryItemRecord(data as Omit<
    InventoryItemRecord,
    "stock_quantity" | "low_stock_threshold" | "cost" | "reference_sale_price"
  > & {
    stock_quantity: number | string | null;
    low_stock_threshold: number | string | null;
    cost: number | string | null;
    reference_sale_price: number | string | null;
  });
}

export async function getInventoryItemForEdit(itemId: string) {
  return getInventoryItem(itemId);
}

export async function upsertInventoryItem(values: InventoryItemFormValues, itemId?: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const input = normalizeInventoryItemInput(values);

  let existingItem: Pick<InventoryItemRecord, "stock_quantity"> | null = null;

  if (itemId) {
    const { data } = await supabase
      .from("inventory_items")
      .select("stock_quantity")
      .eq("workshop_id", workshop.id)
      .eq("id", itemId)
      .maybeSingle();

    existingItem = (data as Pick<InventoryItemRecord, "stock_quantity"> | null) ?? null;
  }

  const payload = {
    workshop_id: workshop.id,
    name: input.name,
    description: input.description || null,
    stock_quantity: input.stockQuantity,
    low_stock_threshold: input.lowStockThreshold,
    cost: input.cost,
    reference_sale_price: input.referenceSalePrice,
    sku: input.sku || null,
    notes: input.notes || null,
    updated_at: new Date().toISOString(),
  };

  const query = itemId
    ? supabase.from("inventory_items").update(payload).eq("workshop_id", workshop.id).eq("id", itemId)
    : supabase.from("inventory_items").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  const item = normalizeInventoryItemRecord(data as Omit<
    InventoryItemRecord,
    "stock_quantity" | "low_stock_threshold" | "cost" | "reference_sale_price"
  > & {
    stock_quantity: number | string | null;
    low_stock_threshold: number | string | null;
    cost: number | string | null;
    reference_sale_price: number | string | null;
  });

  const previousQuantity = existingItem ? Number(existingItem.stock_quantity ?? 0) : 0;
  const delta = Number((item.stock_quantity - previousQuantity).toFixed(2));

  if (!itemId && item.stock_quantity !== 0) {
    await insertInventoryMovement(workshop.id, {
      inventoryItemId: item.id,
      movementType: "initial_stock",
      quantityDelta: item.stock_quantity,
      note: "Stock inicial",
    });
  } else if (itemId && delta !== 0) {
    await insertInventoryMovement(workshop.id, {
      inventoryItemId: item.id,
      movementType: "manual_adjustment",
      quantityDelta: delta,
      note: "Ajuste manual de stock",
    });
  }

  return item;
}

export async function syncWorkOrderInventoryUsage(params: {
  workshopId: string;
  workOrderId: string;
  previousUsage: Record<string, number>;
  nextUsage: Record<string, number>;
}) {
  const supabase = await createSupabaseDataClient();
  const itemIds = Array.from(new Set([...Object.keys(params.previousUsage), ...Object.keys(params.nextUsage)]));

  const deltas = itemIds.reduce<Record<string, number>>((acc, itemId) => {
    const previous = params.previousUsage[itemId] ?? 0;
    const next = params.nextUsage[itemId] ?? 0;
    const usageDelta = Number((next - previous).toFixed(2));

    if (usageDelta !== 0) {
      acc[itemId] = Number((-usageDelta).toFixed(2));
    }

    return acc;
  }, {});

  if (Object.keys(deltas).length) {
    await updateInventoryQuantities(params.workshopId, deltas);
  }

  const { error: deleteError } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("workshop_id", params.workshopId)
    .eq("reference_type", "work_order")
    .eq("reference_id", params.workOrderId);

  if (deleteError) {
    throw deleteError;
  }

  const movementRows = Object.entries(params.nextUsage)
    .filter(([, quantity]) => quantity > 0)
    .map(([inventoryItemId, quantity]) => ({
      workshop_id: params.workshopId,
      inventory_item_id: inventoryItemId,
      movement_type: "work_order_usage" as const,
      quantity_delta: Number((-quantity).toFixed(2)),
      reference_type: "work_order",
      reference_id: params.workOrderId,
      note: "Salida por orden completada",
    }));

  if (!movementRows.length) {
    return;
  }

  const { error: insertError } = await supabase.from("inventory_movements").insert(movementRows);

  if (insertError) {
    throw insertError;
  }
}

export function getInventoryEditHref(itemId: string) {
  return `/app/inventory/${itemId}/edit` as Route;
}

export async function requireInventoryItemOrRedirect(itemId: string) {
  try {
    return await getInventoryItem(itemId);
  } catch {
    redirect("/app/inventory" as Route);
  }
}
