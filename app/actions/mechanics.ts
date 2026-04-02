"use server";

import { revalidatePath } from "next/cache";

import { upsertMechanic } from "@/lib/data/mechanics";
import { mechanicProfileSchema, type MechanicProfileValues } from "@/lib/mechanics/schema";

type SaveMechanicResult =
  | {
      success: true;
      message: string;
      mechanicId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveMechanicAction(
  values: MechanicProfileValues,
  mechanicId?: string,
): Promise<SaveMechanicResult> {
  const parsed = mechanicProfileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa el integrante antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const mechanic = await upsertMechanic(parsed.data, mechanicId);

    revalidatePath("/app/mechanics");
    revalidatePath(`/app/mechanics/${mechanic.id}`);
    revalidatePath("/app/work-orders");

    return {
      success: true,
      message: "Integrante guardado.",
      mechanicId: mechanic.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el integrante.",
    };
  }
}
