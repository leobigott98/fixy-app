"use server";

import { revalidatePath } from "next/cache";

import { upsertInventoryItem } from "@/lib/data/inventory";
import {
  inventoryItemSchema,
  type InventoryItemFormValues,
} from "@/lib/inventory/schema";

type SaveInventoryResult =
  | {
      success: true;
      message: string;
      inventoryItemId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveInventoryItemAction(
  values: InventoryItemFormValues,
  itemId?: string,
): Promise<SaveInventoryResult> {
  const parsed = inventoryItemSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa el repuesto antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const item = await upsertInventoryItem(parsed.data, itemId);

    revalidatePath("/app/inventory");
    revalidatePath("/app/work-orders");
    revalidatePath("/app/quotes");
    revalidatePath("/app/dashboard");

    return {
      success: true,
      message: "Repuesto guardado.",
      inventoryItemId: item.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el repuesto.",
    };
  }
}
