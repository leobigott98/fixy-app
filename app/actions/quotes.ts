"use server";

import { revalidatePath } from "next/cache";

import { updateQuoteLifecycle, upsertQuote } from "@/lib/data/quotes";
import { quoteFormSchema, type QuoteFormValues } from "@/lib/quotes/schema";

type SaveQuoteResult =
  | {
      success: true;
      message: string;
      quoteId: string;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function saveQuoteAction(
  values: QuoteFormValues,
  quoteId?: string,
): Promise<SaveQuoteResult> {
  const parsed = quoteFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      message: "Revisa el presupuesto antes de guardar.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const quote = await upsertQuote(parsed.data, quoteId);

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quote.id}`);
    revalidatePath("/app/dashboard");
    revalidatePath("/app/clients");
    revalidatePath("/app/vehicles");
    revalidatePath("/app/inventory");

    return {
      success: true,
      message: "Presupuesto guardado.",
      quoteId: quote.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo guardar el presupuesto.",
    };
  }
}

export async function updateQuoteLifecycleAction(
  quoteId: string,
  action: "archive" | "restore" | "delete",
): Promise<SaveQuoteResult> {
  try {
    const quote = await updateQuoteLifecycle(quoteId, action);

    revalidatePath("/app/quotes");
    revalidatePath(`/app/quotes/${quoteId}`);
    revalidatePath("/app/dashboard");
    revalidatePath("/app/work-orders");
    revalidatePath("/app/inventory");

    return {
      success: true,
      message:
        action === "archive"
          ? "Presupuesto archivado."
          : action === "restore"
            ? "Presupuesto reactivado."
            : "Presupuesto eliminado.",
      quoteId: quote.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "No se pudo actualizar el presupuesto.",
    };
  }
}
