"use server";

import { revalidatePath } from "next/cache";

import { upsertCurrentWorkshop } from "@/lib/data/workshops";
import { workshopProfileSchema, type WorkshopProfileInput } from "@/lib/workshops/schema";

type SaveWorkshopResult =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveWorkshopProfileAction(
  values: WorkshopProfileInput,
): Promise<SaveWorkshopResult> {
  const parsed = workshopProfileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa los datos del taller.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await upsertCurrentWorkshop(parsed.data);

    revalidatePath("/app");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings");

    return {
      success: true,
      message: "Perfil del taller guardado.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar la informacion del taller.";

    return {
      success: false,
      message,
    };
  }
}
