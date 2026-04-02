import { z } from "zod";

import { quoteItemTypeOptions, quoteStatusValues } from "@/lib/quotes/constants";

export const quoteItemFormSchema = z.object({
  rowId: z.string(),
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
  laborItems: z.array(quoteItemFormSchema),
  partItems: z.array(quoteItemFormSchema),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;
export type QuoteItemFormValues = z.infer<typeof quoteItemFormSchema>;

export type QuoteItemInput = {
  itemType: "labor" | "part";
  description: string;
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
      itemType,
      description: item.description,
      quantity,
      unitPrice,
      lineTotal: Number((quantity * unitPrice).toFixed(2)),
      sortOrder: index,
    };
  });
}

export function calculateQuoteTotals(laborItems: QuoteItemInput[], partItems: QuoteItemInput[]) {
  const laborSubtotal = laborItems.reduce((total, item) => total + item.lineTotal, 0);
  const partsSubtotal = partItems.reduce((total, item) => total + item.lineTotal, 0);
  const subtotal = Number((laborSubtotal + partsSubtotal).toFixed(2));

  return {
    laborSubtotal,
    partsSubtotal,
    subtotal,
    total: subtotal,
  };
}

export function normalizeQuoteInput(values: QuoteFormValues): QuoteInput {
  const laborItems = mapQuoteItems(values.laborItems, "labor");
  const partItems = mapQuoteItems(values.partItems, "part");
  const totals = calculateQuoteTotals(laborItems, partItems);

  return {
    clientId: values.clientId,
    vehicleId: values.vehicleId,
    status: values.status,
    notes: values.notes,
    laborItems,
    partItems,
    subtotal: totals.subtotal,
    total: totals.total,
  };
}
