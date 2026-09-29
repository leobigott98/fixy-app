import { z } from "zod";

import { quoteItemTypeOptions, quoteStatusValues } from "@/lib/quotes/constants";

export const quoteItemFormSchema = z.object({
  rowId: z.string(),
  inventoryItemId: z.string(),
  workGroup: z.string().trim().min(2, "Indica el trabajo al que pertenece.").default("Trabajo general"),
  unit: z.string().trim().min(1, "Indica la unidad.").default("unidad"),
  unitCost: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), "Ingresa un costo valido.")
    .default(""),
  costSource: z.string().trim().default("manual"),
  itemType: z.enum(
    quoteItemTypeOptions.map((option) => option.value) as ["labor", "part"],
    "Selecciona el tipo de item.",
  ),
  description: z.string().trim().min(2, "Describe el item."),
  quantity: z
    .string()
    .trim()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Ingresa una cantidad valida."),
  unitPrice: z
    .string()
    .trim()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Ingresa un precio valido."),
});

export const quoteFormSchema = z.object({
  clientId: z.string().uuid("Selecciona un cliente."),
  vehicleId: z.string().uuid("Selecciona un vehiculo."),
  status: z.enum(quoteStatusValues, "Selecciona un estado."),
  notes: z.string().trim(),
  validUntil: z.string().trim().default(""),
  discountAmount: z
    .string()
    .trim()
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Ingresa un descuento valido.")
    .default("0"),
  taxStatus: z.enum(["pending", "applied", "not_applicable"]).default("pending"),
  taxLabel: z.string().trim().default(""),
  taxRate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+(\.\d{1,4})?$/.test(value), "Ingresa una tasa valida.")
    .default(""),
  laborItems: z.array(quoteItemFormSchema),
  partItems: z.array(quoteItemFormSchema),
});

export type QuoteFormValues = z.input<typeof quoteFormSchema>;
export type QuoteItemFormValues = z.input<typeof quoteItemFormSchema>;

export type QuoteItemInput = {
  sourceRowId?: string;
  itemType: "labor" | "part";
  inventoryItemId?: string;
  description: string;
  workGroup?: string;
  unit?: string;
  unitCost?: number | null;
  costSource?: string | null;
  costCapturedAt?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
};

export type QuoteInput = {
  clientId: string;
  vehicleId: string;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  notes: string;
  validUntil?: string;
  discountAmount: number;
  taxStatus: "pending" | "applied" | "not_applicable";
  taxLabel?: string;
  taxRate: number | null;
  taxAmount: number | null;
  laborItems: QuoteItemInput[];
  partItems: QuoteItemInput[];
  subtotal: number;
  total: number;
};

export function mapQuoteItems(items: QuoteItemFormValues[], itemType: "labor" | "part"): QuoteItemInput[] {
  return items.map((item, index) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    return {
      sourceRowId: item.rowId,
      itemType,
      inventoryItemId: item.inventoryItemId || undefined,
      description: item.description,
      workGroup: item.workGroup || "Trabajo general",
      unit: item.unit || (itemType === "labor" ? "servicio" : "unidad"),
      unitCost: item.unitCost?.trim() ? Number(item.unitCost) : null,
      costSource: item.unitCost?.trim() ? item.costSource || "manual" : null,
      quantity,
      unitPrice,
      lineTotal: Number((quantity * unitPrice).toFixed(2)),
      sortOrder: index,
    };
  });
}

export function calculateQuoteTotals(
  laborItems: QuoteItemInput[],
  partItems: QuoteItemInput[],
  options: { discountAmount?: number; taxStatus?: "pending" | "applied" | "not_applicable"; taxRate?: number | null } = {},
) {
  const laborSubtotal = laborItems.reduce((total, item) => total + item.lineTotal, 0);
  const partsSubtotal = partItems.reduce((total, item) => total + item.lineTotal, 0);
  const subtotal = Number((laborSubtotal + partsSubtotal).toFixed(2));

  const discountAmount = Math.min(Number((options.discountAmount ?? 0).toFixed(2)), subtotal);
  const taxableBase = Number((subtotal - discountAmount).toFixed(2));
  const taxAmount =
    options.taxStatus === "applied" && options.taxRate != null
      ? Number((taxableBase * (options.taxRate / 100)).toFixed(2))
      : null;

  return {
    laborSubtotal,
    partsSubtotal,
    subtotal,
    total: Number((taxableBase + (taxAmount ?? 0)).toFixed(2)),
    discountAmount,
    taxableBase,
    taxAmount,
  };
}

export function normalizeQuoteInput(values: QuoteFormValues): QuoteInput {
  const laborItems = mapQuoteItems(values.laborItems, "labor");
  const partItems = mapQuoteItems(values.partItems, "part");
  const discountAmount = Number(values.discountAmount ?? 0);
  const taxRate = values.taxRate?.trim() ? Number(values.taxRate) : null;
  const taxStatus = values.taxStatus ?? "pending";
  const totals = calculateQuoteTotals(laborItems, partItems, { discountAmount, taxStatus, taxRate });

  return {
    clientId: values.clientId,
    vehicleId: values.vehicleId,
    status: values.status,
    notes: values.notes,
    validUntil: values.validUntil || undefined,
    discountAmount: totals.discountAmount,
    taxStatus,
    taxLabel: values.taxLabel || undefined,
    taxRate,
    taxAmount: totals.taxAmount,
    laborItems,
    partItems,
    subtotal: totals.subtotal,
    total: totals.total,
  };
}
