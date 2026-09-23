"use server";

import { revalidatePath } from "next/cache";

import { ClientInputError, upsertClient } from "@/lib/data/clients";
import { requireWorkshopOperation } from "@/lib/data/workshops";
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
  try {
    await requireWorkshopOperation("clients.manage");
    const parsed = clientProfileSchema.safeParse(values);

    if (!parsed.success) {
      return {
        success: false,
        message: "Revisa los datos del cliente.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

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
      message:
        error instanceof ClientInputError
          ? error.message
          : "No se pudo guardar el cliente.",
    };
  }
}
