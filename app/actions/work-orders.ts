"use server";

import { revalidatePath } from "next/cache";

import {
  createWorkOrderFromApprovedQuote,
  updateWorkOrderStatus,
  upsertWorkOrder,
  type WorkOrderRecord,
} from "@/lib/data/work-orders";
import { workOrderFormSchema, type WorkOrderFormValues } from "@/lib/work-orders/schema";

type SaveWorkOrderResult =
  | {
      success: true;
      message: string;
      workOrderId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function revalidateWorkOrderPaths(workOrderId: string) {
  revalidatePath("/app/work-orders");
  revalidatePath(`/app/work-orders/${workOrderId}`);
  revalidatePath("/app/dashboard");
  revalidatePath("/app/quotes");
  revalidatePath("/app/mechanics");
}

export async function saveWorkOrderAction(
  values: WorkOrderFormValues,
  workOrderId?: string,
): Promise<SaveWorkOrderResult> {
  const parsed = workOrderFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa la orden antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const workOrder = await upsertWorkOrder(parsed.data, workOrderId);
    revalidateWorkOrderPaths(workOrder.id);

    return {
      success: true,
      message: "Orden guardada.",
      workOrderId: workOrder.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar la orden.",
    };
  }
}

export async function moveWorkOrderStatusAction(
  workOrderId: string,
  status: WorkOrderRecord["status"],
): Promise<{ success: boolean; message: string }> {
  try {
    const workOrder = await updateWorkOrderStatus(workOrderId, status);
    revalidateWorkOrderPaths(workOrder.id);

    return {
      success: true,
      message: "Etapa actualizada.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo mover la orden.",
    };
  }
}

export async function createWorkOrderFromQuoteAction(
  quoteId: string,
): Promise<{ success: boolean; message: string; workOrderId?: string }> {
  try {
    const workOrder = await createWorkOrderFromApprovedQuote(quoteId);
    revalidateWorkOrderPaths(workOrder.id);
    revalidatePath(`/app/quotes/${quoteId}`);

    return {
      success: true,
      message: "Orden creada desde presupuesto aprobado.",
      workOrderId: workOrder.id,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear la orden desde el presupuesto.",
    };
  }
}
