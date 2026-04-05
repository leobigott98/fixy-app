"use server";

import { revalidatePath } from "next/cache";

import { upsertSupplier } from "@/lib/data/suppliers";
import { supplierFormSchema, type SupplierFormValues } from "@/lib/suppliers/schema";

type SaveSupplierResult =
  | {
      success: true;
      message: string;
      supplierId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveSupplierAction(
  values: SupplierFormValues,
  supplierId?: string,
): Promise<SaveSupplierResult> {
  const parsed = supplierFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa los datos del proveedor.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supplier = await upsertSupplier(parsed.data, supplierId);

    revalidatePath("/app/suppliers");
    revalidatePath("/app/purchase-orders");
    revalidatePath("/app/settings");

    return {
      success: true,
      message: "Proveedor guardado.",
      supplierId: supplier.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el proveedor.",
    };
  }
}
