"use server";

import { revalidatePath } from "next/cache";

import { upsertVehicle } from "@/lib/data/vehicles";
import {
  normalizeVehicleProfileInput,
  vehicleProfileFormSchema,
  type VehicleProfileFormValues,
} from "@/lib/vehicles/schema";

type SaveVehicleResult =
  | {
      success: true;
      message: string;
      vehicleId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveVehicleAction(
  values: VehicleProfileFormValues,
  vehicleId?: string,
): Promise<SaveVehicleResult> {
  const parsed = vehicleProfileFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa los datos del vehiculo.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const vehicle = await upsertVehicle(normalizeVehicleProfileInput(parsed.data), vehicleId);

    revalidatePath("/app/vehicles");
    revalidatePath(`/app/vehicles/${vehicle.id}`);
    revalidatePath("/app/clients");

    return {
      success: true,
      message: "Vehiculo guardado.",
      vehicleId: vehicle.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el vehiculo.",
    };
  }
}
