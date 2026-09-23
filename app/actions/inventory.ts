"use server";

import { revalidatePath } from "next/cache";

import { InventoryInputError, upsertInventoryItem } from "@/lib/data/inventory";
import { requireWorkshopOperation } from "@/lib/data/workshops";
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
  try {
    await requireWorkshopOperation("inventory.manage");
    const parsed = inventoryItemSchema.safeParse(values);

    if (!parsed.success) {
      return {
        success: false,
        message: "Revisa el repuesto antes de guardar.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

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
      message:
        error instanceof InventoryInputError
          ? error.message
          : "No se pudo guardar el repuesto.",
    };
  }
}
