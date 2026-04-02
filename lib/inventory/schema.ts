import { z } from "zod";

const decimalString = z
  .string()
  .trim()
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Ingresa un numero valido.");

export const inventoryItemSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del repuesto."),
  description: z.string().trim(),
  stockQuantity: decimalString,
  lowStockThreshold: decimalString,
  cost: decimalString,
  referenceSalePrice: decimalString,
  sku: z.string().trim(),
  notes: z.string().trim(),
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

export type InventoryItemInput = {
  name: string;
  description: string;
  stockQuantity: number;
  lowStockThreshold: number;
  cost: number;
  referenceSalePrice: number;
  sku: string;
  notes: string;
};

export function normalizeInventoryItemInput(values: InventoryItemFormValues): InventoryItemInput {
  return {
    name: values.name,
    description: values.description,
    stockQuantity: Number(values.stockQuantity),
    lowStockThreshold: Number(values.lowStockThreshold),
    cost: Number(values.cost),
    referenceSalePrice: Number(values.referenceSalePrice),
    sku: values.sku,
    notes: values.notes,
  };
}

export function buildInventoryItemFormDefaults(
  source?: Partial<{
    name: string | null;
    description: string | null;
    stockQuantity: number | null;
    lowStockThreshold: number | null;
    cost: number | null;
    referenceSalePrice: number | null;
    sku: string | null;
    notes: string | null;
  }>,
): InventoryItemFormValues {
  return {
    name: source?.name ?? "",
    description: source?.description ?? "",
    stockQuantity: String(source?.stockQuantity ?? 0),
    lowStockThreshold: String(source?.lowStockThreshold ?? 0),
    cost: String(source?.cost ?? 0),
    referenceSalePrice: String(source?.referenceSalePrice ?? 0),
    sku: source?.sku ?? "",
    notes: source?.notes ?? "",
  };
}
