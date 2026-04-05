"use server";

import { revalidatePath } from "next/cache";

import { upsertPurchaseOrder } from "@/lib/data/purchase-orders";
import {
  purchaseOrderFormSchema,
  type PurchaseOrderFormValues,
} from "@/lib/purchase-orders/schema";

type SavePurchaseOrderResult =
  | {
      success: true;
      message: string;
      purchaseOrderId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function savePurchaseOrderAction(
  values: PurchaseOrderFormValues,
  purchaseOrderId?: string,
): Promise<SavePurchaseOrderResult> {
  const parsed = purchaseOrderFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa la orden de compra antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const purchaseOrder = await upsertPurchaseOrder(parsed.data, purchaseOrderId);

    revalidatePath("/app/purchase-orders");
    revalidatePath("/app/suppliers");
    revalidatePath("/app/inventory");
    revalidatePath("/app/reports");

    return {
      success: true,
      message: "Orden de compra guardada.",
      purchaseOrderId: purchaseOrder.id,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo guardar la orden de compra.",
    };
  }
}
