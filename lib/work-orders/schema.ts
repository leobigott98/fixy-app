import { z } from "zod";

import { workOrderItemTypeOptions, workOrderStatusValues } from "@/lib/work-orders/constants";

export const workOrderItemFormSchema = z.object({
  rowId: z.string(),
  itemType: z.enum(
    workOrderItemTypeOptions.map((option) => option.value) as ["service", "part"],
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

export const workOrderFormSchema = z.object({
  clientId: z.string().uuid("Selecciona un cliente."),
  vehicleId: z.string().uuid("Selecciona un vehiculo."),
  quoteId: z.string().optional(),
  title: z.string().trim().min(2, "Define un titulo corto para la orden."),
  status: z.enum(workOrderStatusValues, "Selecciona un estado."),
  assignedMechanicId: z.string(),
  promisedDate: z.string().trim(),
  notes: z.string().trim(),
  referencePhotoUrls: z.array(z.string().url("Sube referencias validas.")).max(12, "Maximo 12 fotos."),
  serviceItems: z.array(workOrderItemFormSchema),
  partItems: z.array(workOrderItemFormSchema),
});

export type WorkOrderFormValues = z.infer<typeof workOrderFormSchema>;
export type WorkOrderItemFormValues = z.infer<typeof workOrderItemFormSchema>;

export type WorkOrderItemInput = {
  itemType: "service" | "part";
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  sortOrder: number;
};

export type WorkOrderInput = {
  clientId: string;
  vehicleId: string;
  quoteId?: string;
  title: string;
  status:
    | "presupuesto_pendiente"
    | "diagnostico_pendiente"
    | "en_reparacion"
    | "listo_para_entrega"
    | "completada"
    | "cancelada";
  assignedMechanicId?: string;
  promisedDate?: string;
  notes: string;
  referencePhotoUrls: string[];
  serviceItems: WorkOrderItemInput[];
  partItems: WorkOrderItemInput[];
  total: number;
};

export function mapWorkOrderItems(
  items: WorkOrderItemFormValues[],
  itemType: "service" | "part",
): WorkOrderItemInput[] {
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

export function calculateWorkOrderTotal(serviceItems: WorkOrderItemInput[], partItems: WorkOrderItemInput[]) {
  return Number(
    (
      serviceItems.reduce((total, item) => total + item.lineTotal, 0) +
      partItems.reduce((total, item) => total + item.lineTotal, 0)
    ).toFixed(2),
  );
}

export function normalizeWorkOrderInput(values: WorkOrderFormValues): WorkOrderInput {
  const serviceItems = mapWorkOrderItems(values.serviceItems, "service");
  const partItems = mapWorkOrderItems(values.partItems, "part");

  return {
    clientId: values.clientId,
    vehicleId: values.vehicleId,
    quoteId: values.quoteId || undefined,
    title: values.title,
    status: values.status,
    assignedMechanicId: values.assignedMechanicId || undefined,
    promisedDate: values.promisedDate || undefined,
    notes: values.notes,
    referencePhotoUrls: values.referencePhotoUrls,
    serviceItems,
    partItems,
    total: calculateWorkOrderTotal(serviceItems, partItems),
  };
}
