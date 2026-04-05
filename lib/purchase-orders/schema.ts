import { z } from "zod";

import { purchaseOrderStatusOptions } from "@/lib/purchase-orders/constants";

const decimalString = z
  .string()
  .trim()
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Ingresa un numero valido.");

export const purchaseOrderItemFormSchema = z.object({
  rowId: z.string(),
  inventoryItemId: z.string(),
  description: z.string().trim().min(2, "Describe el item."),
  quantity: decimalString,
  unitCost: decimalString,
});

export const purchaseOrderFormSchema = z.object({
  supplierId: z.string().uuid("Selecciona un proveedor."),
  date: z.string().trim().min(1, "Selecciona la fecha."),
  status: z.enum(
    purchaseOrderStatusOptions.map((option) => option.value) as [
      "draft",
      "sent",
      "received",
      "cancelled",
    ],
    "Selecciona el estado.",
  ),
  notes: z.string().trim(),
  items: z.array(purchaseOrderItemFormSchema).min(1, "Agrega al menos un item."),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
export type PurchaseOrderItemFormValues = z.infer<typeof purchaseOrderItemFormSchema>;

export type PurchaseOrderItemInput = {
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  sortOrder: number;
};

export type PurchaseOrderInput = {
  supplierId: string;
  date: string;
  status: "draft" | "sent" | "received" | "cancelled";
  notes: string;
  items: PurchaseOrderItemInput[];
  total: number;
};

export function normalizePurchaseOrderInput(values: PurchaseOrderFormValues): PurchaseOrderInput {
  const items = values.items.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);

    return {
      inventoryItemId: item.inventoryItemId || undefined,
      description: item.description,
      quantity,
      unitCost,
      lineTotal: Number((quantity * unitCost).toFixed(2)),
      sortOrder: index,
    };
  });

  return {
    supplierId: values.supplierId,
    date: values.date,
    status: values.status,
    notes: values.notes,
    items,
    total: Number(items.reduce((total, item) => total + item.lineTotal, 0).toFixed(2)),
  };
}

export function buildPurchaseOrderFormDefaults(
  source?: Partial<{
    supplierId: string | null;
    date: string | null;
    status: PurchaseOrderInput["status"] | null;
    notes: string | null;
  }> & {
    items?: Array<{
      id: string;
      inventory_item_id: string | null;
      description: string;
      quantity: number;
      unit_cost: number;
    }>;
  },
): PurchaseOrderFormValues {
  return {
    supplierId: source?.supplierId ?? "",
    date: source?.date ?? new Date().toISOString().slice(0, 10),
    status: source?.status ?? "draft",
    notes: source?.notes ?? "",
    items:
      source?.items?.map((item) => ({
        rowId: item.id,
        inventoryItemId: item.inventory_item_id ?? "",
        description: item.description,
        quantity: String(item.quantity),
        unitCost: String(item.unit_cost),
      })) ?? [
        {
          rowId: crypto.randomUUID(),
          inventoryItemId: "",
          description: "",
          quantity: "1",
          unitCost: "",
        },
      ],
  };
}
