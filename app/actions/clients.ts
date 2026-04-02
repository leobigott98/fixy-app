"use server";

import { revalidatePath } from "next/cache";

import { upsertClient } from "@/lib/data/clients";
import { clientProfileSchema, type ClientProfileInput } from "@/lib/clients/schema";

type SaveClientResult =
  | {
      success: true;
      message: string;
      clientId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveClientAction(
  values: ClientProfileInput,
  clientId?: string,
): Promise<SaveClientResult> {
  const parsed = clientProfileSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa los datos del cliente.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const client = await upsertClient(parsed.data, clientId);

    revalidatePath("/app/clients");
    revalidatePath(`/app/clients/${client.id}`);
    revalidatePath("/app/vehicles");

    return {
      success: true,
      message: "Cliente guardado.",
      clientId: client.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el cliente.",
    };
  }
}
